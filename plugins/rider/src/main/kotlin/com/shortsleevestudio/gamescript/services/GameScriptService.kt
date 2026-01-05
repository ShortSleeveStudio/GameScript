package com.shortsleevestudio.gamescript.services

import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project

/**
 * Project-level service for GameScript.
 * Manages shared state and coordinates between components.
 */
@Service(Service.Level.PROJECT)
class GameScriptService(
    private val project: Project
) : Disposable {

    override fun dispose() {
        // Cleanup resources
    }

    companion object {
        fun getInstance(project: Project): GameScriptService =
            project.getService(GameScriptService::class.java)
    }
}
