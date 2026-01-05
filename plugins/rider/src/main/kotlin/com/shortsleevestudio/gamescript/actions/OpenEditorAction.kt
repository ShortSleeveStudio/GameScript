package com.shortsleevestudio.gamescript.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.fileEditor.FileEditorManager
import com.shortsleevestudio.gamescript.editor.GameScriptVirtualFile

/**
 * Action to open the GameScript editor as an editor tab.
 * Available from Tools menu. Singleton - navigates to existing tab if already open.
 */
class OpenEditorAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val editorManager = FileEditorManager.getInstance(project)

        // Check if GameScript tab is already open - navigate to it instead of opening a new one
        val existingFile = editorManager.openFiles.filterIsInstance<GameScriptVirtualFile>().firstOrNull()
        if (existingFile != null) {
            editorManager.openFile(existingFile, true)
            return
        }

        val virtualFile = GameScriptVirtualFile(project)
        editorManager.openFile(virtualFile, true)
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }
}
