package com.shortsleevestudio.gamescript.browser

import com.intellij.ide.IdeEventQueue
import com.intellij.openapi.Disposable
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.colors.EditorColorsListener
import com.intellij.openapi.editor.colors.EditorColorsManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.util.SystemInfo
import com.intellij.ui.jcef.JBCefBrowser
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandlerAdapter
import org.cef.handler.CefRequestHandlerAdapter
import org.cef.handler.CefResourceHandler
import org.cef.handler.CefResourceRequestHandler
import org.cef.handler.CefResourceRequestHandlerAdapter
import org.cef.misc.BoolRef
import org.cef.network.CefRequest
import java.awt.Component
import java.awt.KeyboardFocusManager
import java.awt.event.KeyEvent
import java.beans.PropertyChangeListener
import java.util.concurrent.atomic.AtomicBoolean
import javax.swing.SwingUtilities
import com.shortsleevestudio.gamescript.database.DatabaseManager
import com.shortsleevestudio.gamescript.handlers.CodeHandlers
import com.shortsleevestudio.gamescript.handlers.DbHandlers
import com.shortsleevestudio.gamescript.handlers.DialogHandlers
import com.shortsleevestudio.gamescript.handlers.EditorHandlers
import com.shortsleevestudio.gamescript.handlers.FileHandlers
import com.shortsleevestudio.gamescript.handlers.HandlerContext
import com.shortsleevestudio.gamescript.handlers.MessageMediator
import com.shortsleevestudio.gamescript.handlers.NotificationHandlers
import com.shortsleevestudio.gamescript.services.GameScriptBackendHost
import com.shortsleevestudio.gamescript.settings.GameScriptSettings
import com.shortsleevestudio.gamescript.theme.ThemeMapper
import com.shortsleevestudio.gamescript.watchers.CodeFileWatcher
import com.shortsleevestudio.gamescript.watchers.SnapshotCommandWatcher
import java.awt.BorderLayout
import javax.swing.JComponent
import javax.swing.JPanel

/**
 * Main browser panel that hosts the GameScript Svelte UI.
 * Uses JCEF (Java Chromium Embedded Framework) to render the web content.
 *
 * Uses CefRequestHandler to intercept HTTPS requests and serve resources
 * from the plugin JAR, enabling ES module support.
 */
class GameScriptBrowserPanel(
    private val project: Project
) : Disposable {

    private val panel: JPanel = JPanel(BorderLayout())
    private val browser: JBCefBrowser

    // Core services
    private val databaseManager: DatabaseManager
    private val mediator: MessageMediator
    private val themeMapper: ThemeMapper
    private lateinit var messageBridge: MessageBridge
    private lateinit var handlerContext: HandlerContext

    // File watchers (created after this is a Disposable, registered with VFS)
    private lateinit var codeFileWatcher: CodeFileWatcher
    private lateinit var snapshotCommandWatcher: SnapshotCommandWatcher

    // Explicit focus tracking for reliable keyboard interception.
    // We track focus at two levels:
    // 1. CefFocusHandler - tracks CEF/Chromium-level focus (when clicking inside the webview)
    // 2. KeyboardFocusManager - tracks Swing-level focus (detects when focus leaves our component)
    // Both are needed because CEF's onTakeFocus doesn't fire reliably when clicking outside
    // the JCEF component (e.g., clicking on another editor tab).
    // Uses AtomicBoolean for thread-safe access from CEF, EDT, and Swing threads.
    private val webviewHasFocus = AtomicBoolean(false)
    private lateinit var focusChangeListener: PropertyChangeListener

    val component: JComponent
        get() = panel

    init {
        // Initialize services
        databaseManager = DatabaseManager()
        mediator = MessageMediator()
        themeMapper = ThemeMapper()

        // Create file watchers (registered with VFS, disposed with this panel)
        codeFileWatcher = CodeFileWatcher(this)
        snapshotCommandWatcher = SnapshotCommandWatcher(this)

        // Create JCEF browser
        browser = JBCefBrowser.createBuilder()
            .setOffScreenRendering(false)
            .build()

        // Add request handler to intercept and serve resources from JAR
        browser.jbCefClient.addRequestHandler(GameScriptRequestHandler(), browser.cefBrowser)

        // CEF-level focus tracking: detects focus changes within the browser.
        browser.jbCefClient.addFocusHandler(object : org.cef.handler.CefFocusHandler {
            override fun onTakeFocus(cefBrowser: CefBrowser?, next: Boolean) {
                webviewHasFocus.set(false)
            }

            override fun onSetFocus(cefBrowser: CefBrowser?, source: org.cef.handler.CefFocusHandler.FocusSource?): Boolean {
                webviewHasFocus.set(true)
                return false // Allow focus to be set
            }

            override fun onGotFocus(cefBrowser: CefBrowser?) {
                webviewHasFocus.set(true)
            }
        }, browser.cefBrowser)

        // Swing-level focus tracking: detects when focus leaves our component hierarchy.
        // CEF's onTakeFocus doesn't fire reliably when clicking outside JCEF (e.g., another editor tab).
        focusChangeListener = PropertyChangeListener { evt ->
            val newOwner = evt.newValue as? Component
            if (newOwner != null && !SwingUtilities.isDescendingFrom(newOwner, panel)) {
                webviewHasFocus.set(false)
            }
        }
        KeyboardFocusManager.getCurrentKeyboardFocusManager()
            .addPropertyChangeListener("permanentFocusOwner", focusChangeListener)

        // Initialize message bridge (handles JS injection on load)
        messageBridge = MessageBridge(project, browser, mediator)

        // Register IdeEventQueue dispatcher to intercept edit shortcuts (Cmd+Z, Cmd+Shift+Z, Cmd+S)
        // at the AWT level, BEFORE the IDE Action System processes them.
        // This prevents Rider's native undo/redo/save from interfering with the webview.
        // Note: CefKeyboardHandler doesn't work because it fires AFTER the IDE has already processed the action.
        val keyboardDispatcher = IdeEventQueue.EventDispatcher { event ->
            if (event !is KeyEvent || event.id != KeyEvent.KEY_PRESSED) {
                return@EventDispatcher false
            }

            // Use explicit focus flag instead of Swing ancestry check
            // This is reliable with JCEF where the focused component may be a native peer
            if (!webviewHasFocus.get()) {
                return@EventDispatcher false
            }

            val isCommand = if (SystemInfo.isMac) event.isMetaDown else event.isControlDown
            val isShift = event.isShiftDown

            when {
                // Cmd/Ctrl + Z (no shift) = Undo
                isCommand && !isShift && event.keyCode == KeyEvent.VK_Z -> {
                    messageBridge.postToUI("edit:undo", emptyMap())
                    event.consume()
                    true // fully consumed - stops IDE from processing
                }

                // Cmd/Ctrl + Shift + Z = Redo
                isCommand && isShift && event.keyCode == KeyEvent.VK_Z -> {
                    messageBridge.postToUI("edit:redo", emptyMap())
                    event.consume()
                    true
                }

                // Cmd/Ctrl + Y = Redo (Windows style)
                isCommand && !isShift && event.keyCode == KeyEvent.VK_Y -> {
                    messageBridge.postToUI("edit:redo", emptyMap())
                    event.consume()
                    true
                }

                // Cmd/Ctrl + S = Save
                isCommand && !isShift && event.keyCode == KeyEvent.VK_S -> {
                    messageBridge.postToUI("edit:save", emptyMap())
                    event.consume()
                    true
                }

                else -> false
            }
        }
        // Register with this as parent disposable - auto-cleanup when panel is disposed
        IdeEventQueue.getInstance().addDispatcher(keyboardDispatcher, this)

        // Create handler context
        handlerContext = HandlerContext(
            project = project,
            bridge = messageBridge,
            databaseManager = databaseManager,
            settings = GameScriptSettings.getInstance(project)
        )

        // Register message handlers
        registerHandlers()

        // Set up theme change listener
        setupThemeListener()

        // Add load handler for additional post-load initialization
        browser.jbCefClient.addLoadHandler(object : CefLoadHandlerAdapter() {
            override fun onLoadEnd(cefBrowser: CefBrowser, frame: CefFrame, httpStatusCode: Int) {
                if (frame.isMain) {
                    onPageLoaded()
                }
            }

            override fun onLoadError(
                browser: CefBrowser,
                frame: CefFrame,
                errorCode: org.cef.handler.CefLoadHandler.ErrorCode,
                errorText: String,
                failedUrl: String
            ) {
                if (frame.isMain) {
                    LOG.error("Failed to load: $failedUrl - $errorText ($errorCode)")
                }
            }
        }, browser.cefBrowser)

        // Add browser component to panel
        panel.add(browser.component, BorderLayout.CENTER)

        // Load the UI via HTTPS (intercepted by our request handler)
        browser.loadURL(UI_URL)

        // Register for disposal
        // Note: This panel is registered as a child of GameScriptFileEditor,
        // NOT the project. The file editor handles disposal when the tab is closed.
        Disposer.register(this, messageBridge)
        Disposer.register(this, databaseManager)
        Disposer.register(this, codeFileWatcher)
        Disposer.register(this, snapshotCommandWatcher)
    }

    /**
     * Register all message handlers.
     */
    private fun registerHandlers() {
        // Database handlers
        val dbHandlers = DbHandlers(
            context = handlerContext,
            onConnected = {},
            onDisconnected = {}
        )
        mediator.registerAll(dbHandlers.getHandlers())

        // File handlers
        val fileHandlers = FileHandlers(handlerContext)
        mediator.registerAll(fileHandlers.getHandlers())

        // Dialog handlers
        val dialogHandlers = DialogHandlers(handlerContext)
        mediator.registerAll(dialogHandlers.getHandlers())

        // Code handlers (with backend host for C#/C++ semantic lookup)
        // Pass the host instance so the model can be resolved lazily, allowing
        // it to become available after the panel is created (e.g., solution still loading)
        val codeHandlers = CodeHandlers(handlerContext, codeFileWatcher,
            GameScriptBackendHost.getInstance(project))
        mediator.registerAll(codeHandlers.getHandlers())

        // Editor handlers
        val editorHandlers = EditorHandlers(handlerContext)
        mediator.registerAll(editorHandlers.getHandlers())

        // Notification handlers
        val notificationHandlers = NotificationHandlers(handlerContext)
        mediator.registerAll(notificationHandlers.getHandlers())
        Disposer.register(this) { notificationHandlers.dispose() }

        // Snapshot command watcher handler
        mediator.register("snapshot:watchFolder") { message ->
            handleSnapshotWatchFolder(message)
        }
    }

    /**
     * Handle snapshot:watchFolder message from UI.
     * Sets up the snapshot command watcher for ping commands from game engines.
     */
    private fun handleSnapshotWatchFolder(message: com.google.gson.JsonObject) {
        val folderPath = message.get("folderPath")?.let {
            if (it.isJsonNull) null else it.asString
        }

        if (folderPath == null) {
            snapshotCommandWatcher.clearWatch()
            return
        }

        val absolutePath = "${handlerContext.getWorkspacePath()}/$folderPath"

        snapshotCommandWatcher.setWatchPath(absolutePath) { entityType, id ->
            // Post focus:broadcast to UI (matches VSCode behavior)
            messageBridge.postToUI("focus:broadcast", mapOf(
                "table" to entityType,
                "items" to listOf(mapOf("id" to id))
            ))
        }
    }

    /**
     * Called when the main page has finished loading.
     */
    private fun onPageLoaded() {
        injectThemeStyles()
        sendThemeChanged()
    }

    /**
     * Inject theme styles into the page.
     */
    private fun injectThemeStyles() {
        val themeStyles = themeMapper.getThemeStyles()
        val script = """
            (function() {
                var existing = document.getElementById('gamescript-theme');
                if (existing) existing.remove();
                var div = document.createElement('div');
                div.innerHTML = ${themeStyles.replace("\n", "\\n").let { "'$it'" }};
                document.head.appendChild(div.firstChild);
            })();
        """.trimIndent()
        executeJavaScript(script)
    }

    /**
     * Send theme changed event to UI.
     */
    private fun sendThemeChanged() {
        messageBridge.postToUI("theme:changed", mapOf("isDark" to themeMapper.isDarkTheme()))
    }

    /**
     * Set up listener for IDE theme changes.
     */
    private fun setupThemeListener() {
        val connection = project.messageBus.connect(this)
        connection.subscribe(EditorColorsManager.TOPIC, EditorColorsListener {
            injectThemeStyles()
            sendThemeChanged()
        })
    }

    /**
     * Get the message bridge for external access.
     */
    fun getMessageBridge(): MessageBridge = messageBridge

    /**
     * Get the handler context for external access.
     */
    fun getHandlerContext(): HandlerContext = handlerContext

    /**
     * Execute JavaScript in the browser context.
     *
     * CefBrowser.executeJavaScript is thread-safe and can be called from any thread.
     * Do NOT wrap in invokeLater - this causes deadlocks between EDT and CEF message loop.
     */
    fun executeJavaScript(script: String) {
        if (!browser.isDisposed) {
            browser.cefBrowser.executeJavaScript(script, browser.cefBrowser.url, 0)
        }
    }

    /**
     * Reload the UI.
     */
    fun reload() {
        browser.cefBrowser.reload()
    }

    override fun dispose() {
        // Remove the focus change listener to prevent memory leaks
        KeyboardFocusManager.getCurrentKeyboardFocusManager()
            .removePropertyChangeListener("permanentFocusOwner", focusChangeListener)
        browser.dispose()
    }

    companion object {
        private val LOG = Logger.getInstance(GameScriptBrowserPanel::class.java)

        // Use HTTPS with a fake host - requests are intercepted by GameScriptRequestHandler
        private const val UI_HOST = "gamescript-ui.local"
        // env=jcef tells the UI that the bridge will be injected asynchronously
        private const val UI_URL = "https://$UI_HOST/index.html?env=jcef"
    }

    /**
     * Request handler that intercepts HTTPS requests to our fake host
     * and serves resources from the plugin JAR.
     */
    private inner class GameScriptRequestHandler : CefRequestHandlerAdapter() {

        override fun getResourceRequestHandler(
            browser: CefBrowser?,
            frame: CefFrame?,
            request: CefRequest?,
            isNavigation: Boolean,
            isDownload: Boolean,
            requestInitiator: String?,
            disableDefaultHandling: BoolRef?
        ): CefResourceRequestHandler? {
            val url = request?.url ?: return null

            // Only handle requests to our fake host
            if (!url.startsWith("https://$UI_HOST")) {
                return null
            }

            return GameScriptResourceRequestHandler()
        }
    }

    /**
     * Resource request handler that returns our custom resource handler.
     */
    private inner class GameScriptResourceRequestHandler : CefResourceRequestHandlerAdapter() {

        override fun getResourceHandler(
            browser: CefBrowser?,
            frame: CefFrame?,
            request: CefRequest?
        ): CefResourceHandler? {
            val url = request?.url ?: return null

            // Only handle requests to our fake host
            if (!url.startsWith("https://$UI_HOST")) {
                return null
            }

            return GameScriptSchemeHandler()
        }
    }
}
