rootProject.name = "gamescript"

pluginManagement {
    repositories {
        // JetBrains cache redirector for RdGen plugin (recommended by JetBrains)
        maven("https://cache-redirector.jetbrains.com/intellij-dependencies")
        // JetBrains repository for RdGen plugin
        maven("https://packages.jetbrains.team/maven/p/ij/intellij-dependencies")
        gradlePluginPortal()
        mavenCentral()
    }
}

plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}