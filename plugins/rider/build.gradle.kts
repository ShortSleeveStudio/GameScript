import java.io.File

plugins {
    id("java")
    // Major update to Kotlin 2.3.0 (K2 Compiler)
    id("org.jetbrains.kotlin.jvm") version "2.3.0"
    // Latest IntelliJ Platform Gradle Plugin
    id("org.jetbrains.intellij.platform") version "2.10.5"
}

group = providers.gradleProperty("pluginGroup").get()
version = providers.gradleProperty("pluginVersion").get()

repositories {
    mavenCentral()
    // JetBrains repository for Rd framework and protocol dependencies
    maven("https://packages.jetbrains.team/maven/p/ij/intellij-dependencies")
    intellijPlatform {
        defaultRepositories()
    }
}

// Version constant - must match ReSharper SDK version in C# project
val rdVersion = "2025.3.1"

// Custom configuration for rd-gen (protocol generator)
val rdGenConfiguration by configurations.creating

dependencies {
    intellijPlatform {
        rider(providers.gradleProperty("platformVersion"), useInstaller = false)
        bundledPlugin("com.intellij.modules.rider")

        // Godot support - bundled with Rider 2024.2+
        bundledPlugin("com.intellij.rider.godot")      // Godot Engine support (C# glue, run configs, .tscn)

        // GDScript PSI support - bundled with Rider 2025.3+
        // Provides native PSI parser for GDScript (GdFile, GdFunctionDeclaration, etc.)
        bundledPlugin("com.intellij.rider.godot.gdscript")
    }

    // RdGen dependencies - for compiling the protocol model DSL
    // Note: kotlin-compiler-embeddable version must match the Kotlin version used by Rider
    // Rider 2025.3.1 uses Kotlin 2.2.0
    rdGenConfiguration("com.jetbrains.rd:rd-gen:$rdVersion")
    rdGenConfiguration("org.jetbrains.kotlin:kotlin-compiler-embeddable:2.2.0")

    // Rd framework - Rider provides this at runtime, so use compileOnly to avoid classloader conflicts.
    // Bundling our own rd-framework causes "loader constraint violation" errors because Rider's
    // classloader has already loaded IProtocol from its bundled version.
    compileOnly("com.jetbrains.rd:rd-framework:$rdVersion")

    // Database - SQLite (Latest Dec 2025)
    implementation("org.xerial:sqlite-jdbc:3.51.1.0")

    // Database - PostgreSQL (Stable branch)
    // Exclude kotlinx-coroutines to use IntelliJ's bundled version
    implementation("com.github.jasync-sql:jasync-postgresql:1.2.2") {
        exclude(group = "org.jetbrains.kotlinx", module = "kotlinx-coroutines-core")
        exclude(group = "org.jetbrains.kotlinx", module = "kotlinx-coroutines-core-jvm")
        exclude(group = "org.jetbrains.kotlinx", module = "kotlinx-coroutines-jdk8")
    }

    // JSON serialization (Latest Jan 2026)
    implementation("com.google.code.gson:gson:2.13.2")

    // Kotlin Coroutines - use IntelliJ's bundled version at runtime to avoid classloader conflicts.
    // The plugin bundles its own coroutines JAR which causes ServiceLoader conflicts with IntelliJ's
    // CoroutineExceptionHandler implementation.
    compileOnly("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.2")

    // Testing
    testImplementation(kotlin("test"))
    testImplementation("io.mockk:mockk:1.14.7") {
        // MockK brings in coroutines transitively - exclude to use IntelliJ's bundled version
        exclude(group = "org.jetbrains.kotlinx", module = "kotlinx-coroutines-core")
        exclude(group = "org.jetbrains.kotlinx", module = "kotlinx-coroutines-core-jvm")
    }
    // Use compileOnly for test coroutines - IntelliJ provides the runtime version
    testCompileOnly("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
    testImplementation("org.junit.jupiter:junit-jupiter-params:5.12.2")
}

// Global exclusion: prevent kotlinx-coroutines from being bundled in the plugin
// IntelliJ provides coroutines at runtime, and bundling our own causes ServiceLoader conflicts
configurations.runtimeClasspath {
    exclude(group = "org.jetbrains.kotlinx", module = "kotlinx-coroutines-core")
    exclude(group = "org.jetbrains.kotlinx", module = "kotlinx-coroutines-core-jvm")
    exclude(group = "org.jetbrains.kotlinx", module = "kotlinx-coroutines-jdk8")
    exclude(group = "org.jetbrains.kotlinx", module = "kotlinx-coroutines-bom")
}

kotlin {
    // Stick with 17 for plugin compatibility,
    // though many plugins are moving to 21 now.
    jvmToolchain(17)

    // Include generated protocol sources
    sourceSets {
        main {
            kotlin.srcDir("build/generated/rdgen/kotlin")
        }
    }
}

intellijPlatform {
    pluginConfiguration {
        id = providers.gradleProperty("pluginGroup")
        name = providers.gradleProperty("pluginName")
        version = providers.gradleProperty("pluginVersion")
        description = "Visual dialogue authoring for games - GameScript editor for Rider"

        vendor {
            name = "Short Sleeve Studio"
            url = "https://github.com/ShortSleeveStudio/GameScript"
            email = "support@shortsleevestudio.com"
        }

        ideaVersion {
            // Minimum 2025.1 required for Kotlin 2.x coroutines bytecode compatibility (SpillingKt)
            sinceBuild = "251"
            untilBuild = provider { null }
        }
    }

    publishing {
        token = providers.environmentVariable("JETBRAINS_MARKETPLACE_TOKEN")
        channels = listOf("stable")
    }

}

tasks {
    test {
        useJUnitPlatform()
    }

    // Copy UI dist into resources with "ui" subdirectory
    processResources {
        from("../../ui/dist") {
            into("ui")
        }
    }

    register<Exec>("buildUI") {
        workingDir = file("../../ui")
        commandLine("pnpm", "build")
    }

    // Protocol generation using rd-gen library as executable
    register<JavaExec>("generateProtocol") {
        group = "build"
        description = "Generate Kotlin and C# protocol classes from Rd model"

        mainClass.set("com.jetbrains.rd.generator.nova.MainKt")

        // Classpath includes:
        // - rd-gen library and its dependencies
        // - lib/rd/*.jar: rider-model.jar (SolutionModel.Solution)
        // - lib/rd.jar: Rd utilities
        // - lib/util-8.jar: IntelliJ platform classes
        classpath = rdGenConfiguration + fileTree(intellijPlatform.platformPath) {
            include("lib/rd/*.jar")
            include("lib/rd.jar")
            include("lib/util-8.jar")
        }

        // Working directory is project root so relative paths in model work
        workingDir = projectDir

        val modelDir = file("protocol/src/main/kotlin/model")
        val ktOutputDir = file("build/generated/rdgen/kotlin")
        val csOutputDir = file("src/dotnet/GameScript.Backend/Generated")
        val hashDir = file("build/rdgen/hashes")

        // Ensure output directories exist
        doFirst {
            ktOutputDir.mkdirs()
            csOutputDir.mkdirs()
            hashDir.mkdirs()
        }

        // Build compiler classpath for kotlinc inside rd-gen
        val riderModelJars = fileTree(intellijPlatform.platformPath) {
            include("lib/rd/*.jar")
            include("lib/rd.jar")
            include("lib/util-8.jar")
        }.files.joinToString(File.pathSeparator) { it.absolutePath }

        args(
            "-s", modelDir.absolutePath,
            "-p", "model",
            "-h", hashDir.absolutePath,
            "-c", riderModelJars,
            "-v"
        )

        // Incremental build support
        inputs.dir(modelDir)
        outputs.dir(ktOutputDir)
        outputs.dir(csOutputDir)
    }

    // Generate protocol before compiling Kotlin
    withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        dependsOn("generateProtocol")
    }

    // Build C# backend
    register<Exec>("buildBackend") {
        group = "build"
        description = "Build the C# backend for ReSharper integration"

        val backendDir = file("src/dotnet/GameScript.Backend")
        workingDir = backendDir

        // Only run if the backend project exists
        onlyIf { backendDir.resolve("GameScript.Backend.csproj").exists() }

        // Depend on protocol generation so C# files exist
        dependsOn("generateProtocol")

        commandLine("dotnet", "build", "-c", "Release")
    }

    // Restore NuGet packages for backend
    register<Exec>("restoreBackend") {
        group = "build"
        description = "Restore NuGet packages for C# backend"

        val backendDir = file("src/dotnet/GameScript.Backend")
        workingDir = backendDir

        onlyIf { backendDir.resolve("GameScript.Backend.csproj").exists() }

        commandLine("dotnet", "restore")
    }

    // Ensure backend is built before packaging
    named("buildBackend") {
        dependsOn("restoreBackend")
    }

    // Copy backend DLL to plugin sandbox
    // IntelliJ Platform Gradle Plugin 2.x uses versioned sandbox: {sandbox}/RD-{version}/plugins/
    named("prepareSandbox") {
        dependsOn("buildBackend")

        doLast {
            val backendOutput = file("src/dotnet/GameScript.Backend/bin/Release/net472")
            val pluginName = intellijPlatform.projectName.get().lowercase()
            val platformVersion = providers.gradleProperty("platformVersion").get()

            // IntelliJ Platform Gradle Plugin 2.x puts plugins in versioned subdirectory
            // Format: {sandboxContainer}/RD-{platformVersion}/plugins/{pluginName}/dotnet/
            val sandboxDir = intellijPlatform.sandboxContainer.get()
                .asFile.resolve("RD-$platformVersion/plugins/$pluginName/dotnet")

            if (backendOutput.exists()) {
                sandboxDir.mkdirs()
                backendOutput.resolve("GameScript.Backend.dll").takeIf { it.exists() }
                    ?.copyTo(sandboxDir.resolve("GameScript.Backend.dll"), overwrite = true)
                backendOutput.resolve("GameScript.Backend.pdb").takeIf { it.exists() }
                    ?.copyTo(sandboxDir.resolve("GameScript.Backend.pdb"), overwrite = true)
                println("Copied GameScript.Backend.dll to $sandboxDir")
            } else {
                println("WARNING: Backend output not found at $backendOutput")
            }
        }
    }
}
