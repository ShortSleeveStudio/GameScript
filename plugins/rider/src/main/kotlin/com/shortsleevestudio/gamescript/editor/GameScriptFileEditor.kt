package com.shortsleevestudio.gamescript.editor

import com.intellij.openapi.Disposable
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorLocation
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.util.UserDataHolderBase
import com.shortsleevestudio.gamescript.browser.GameScriptBrowserPanel
import java.beans.PropertyChangeListener
import javax.swing.JComponent

/**
 * File editor that displays the GameScript browser panel as an editor tab.
 * Singleton per project - only one GameScript editor can be open at a time.
 */
class GameScriptFileEditor(
    private val project: Project,
    private val file: GameScriptVirtualFile
) : UserDataHolderBase(), FileEditor, Disposable {

    private val browserPanel: GameScriptBrowserPanel = GameScriptBrowserPanel(project)

    init {
        Disposer.register(this, browserPanel)
        // Track this instance for message forwarding
        instances[project] = this
    }

    override fun getComponent(): JComponent = browserPanel.component

    override fun getPreferredFocusedComponent(): JComponent = browserPanel.component

    override fun getName(): String = "GameScript"

    override fun setState(state: FileEditorState) {}

    override fun isModified(): Boolean = false

    override fun isValid(): Boolean = true

    override fun addPropertyChangeListener(listener: PropertyChangeListener) {}

    override fun removePropertyChangeListener(listener: PropertyChangeListener) {}

    override fun getCurrentLocation(): FileEditorLocation? = null

    override fun dispose() {
        instances.remove(project)
    }

    override fun getFile() = file

    companion object {
        private val instances = mutableMapOf<Project, GameScriptFileEditor>()

        /**
         * Get the GameScript editor instance for a project, if open.
         */
        fun getInstance(project: Project): GameScriptFileEditor? = instances[project]
    }
}
