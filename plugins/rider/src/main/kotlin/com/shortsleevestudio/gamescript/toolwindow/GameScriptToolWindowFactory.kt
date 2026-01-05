package com.shortsleevestudio.gamescript.toolwindow

import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.components.JBLabel
import com.intellij.ui.content.ContentFactory
import com.intellij.util.ui.JBUI
import com.shortsleevestudio.gamescript.editor.GameScriptVirtualFile
import java.awt.BorderLayout
import java.awt.FlowLayout
import javax.swing.JButton
import javax.swing.JPanel

/**
 * Factory for the GameScript tool window sidebar.
 * Shows a button to open the editor and helpful info.
 */
class GameScriptToolWindowFactory : ToolWindowFactory {

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val panel = JPanel(BorderLayout())
        panel.border = JBUI.Borders.empty(10)

        // Open Editor button
        val buttonPanel = JPanel(FlowLayout(FlowLayout.CENTER))
        val openButton = JButton("Open Editor")
        openButton.addActionListener {
            val virtualFile = GameScriptVirtualFile(project)
            FileEditorManager.getInstance(project).openFile(virtualFile, true)
            toolWindow.hide()
        }
        buttonPanel.add(openButton)
        panel.add(buttonPanel, BorderLayout.NORTH)

        // Info section
        val infoPanel = JPanel().apply {
            layout = javax.swing.BoxLayout(this, javax.swing.BoxLayout.Y_AXIS)
            border = JBUI.Borders.emptyTop(20)

            add(JBLabel("<html><b>Keyboard Shortcuts</b></html>"))
            add(JBLabel("Save/Export: Ctrl+S / Cmd+S"))
            add(JBLabel("Undo: Ctrl+Z / Cmd+Z"))
            add(JBLabel("Redo: Ctrl+Shift+Z / Cmd+Shift+Z"))
            add(JBLabel(""))
            add(JBLabel("<html><b>Quick Access</b></html>"))
            add(JBLabel("Tools → Open GameScript Editor"))
        }
        panel.add(infoPanel, BorderLayout.CENTER)

        val content = ContentFactory.getInstance().createContent(panel, "", false)
        toolWindow.contentManager.addContent(content)
    }

    override fun shouldBeAvailable(project: Project): Boolean = true
}
