package com.shortsleevestudio.gamescript.toolwindow

import com.intellij.openapi.Disposable
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.shortsleevestudio.gamescript.browser.GameScriptBrowserPanel
import javax.swing.JComponent

/**
 * Main tool window panel that hosts the GameScript JCEF browser.
 */
class GameScriptToolWindow(
    private val project: Project
) : Disposable {

    private val browserPanel: GameScriptBrowserPanel = GameScriptBrowserPanel(project)

    val component: JComponent
        get() = browserPanel.component

    init {
        Disposer.register(this, browserPanel)
        Disposer.register(project, this)
    }

    /**
     * Get the browser panel for message bridge integration.
     */
    fun getBrowserPanel(): GameScriptBrowserPanel = browserPanel

    override fun dispose() {
        // Browser panel cleanup handled by Disposer
    }
}
