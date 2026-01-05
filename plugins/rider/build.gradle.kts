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
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        rider(providers.gradleProperty("platformVersion"), useInstaller = false)
        bundledPlugin("com.intellij.modules.rider")
    }

    // Database - SQLite (Latest Dec 2025)
    implementation("org.xerial:sqlite-jdbc:3.51.1.0")

    // Database - PostgreSQL (Stable branch)
    implementation("com.github.jasync-sql:jasync-postgresql:1.2.2")

    // JSON serialization (Latest Jan 2026)
    implementation("com.google.code.gson:gson:2.13.2")

    // Kotlin Coroutines (Latest April 2025)
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.2")

    // Testing
    testImplementation(kotlin("test"))
    testImplementation("io.mockk:mockk:1.14.7")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
}

kotlin {
    // Stick with 17 for plugin compatibility,
    // though many plugins are moving to 21 now.
    jvmToolchain(17)
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
            sinceBuild = "243"
            untilBuild = "243.*"
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
}
