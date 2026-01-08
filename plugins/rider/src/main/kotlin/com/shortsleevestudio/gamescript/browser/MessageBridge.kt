package com.shortsleevestudio.gamescript.browser

import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefJSQuery
import com.shortsleevestudio.gamescript.handlers.MessageMediator
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandlerAdapter

/**
 * Bidirectional message bridge between Kotlin and JavaScript.
 *
 * JS → Kotlin: Uses JBCefJSQuery to receive messages
 * Kotlin → JS: Uses executeJavaScript to dispatch MessageEvents
 *
 * The UI expects window.jbCefBrowser.postMessage(jsonString) to be available.
 */
class MessageBridge(
    private val project: Project,
    private val browser: JBCefBrowser,
    private val mediator: MessageMediator
) : Disposable {

    private val gson = Gson()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var jsQuery: JBCefJSQuery? = null
    private var bridgeInjected = false

    init {
        setupJsQuery()
        setupLoadHandler()
        // Note: This is registered as a child of GameScriptBrowserPanel,
        // NOT the project. The panel handles disposal when the tab is closed.
    }

    /**
     * Set up the JBCefJSQuery for receiving messages from JavaScript.
     */
    private fun setupJsQuery() {
        jsQuery = JBCefJSQuery.create(browser as JBCefBrowserBase)
        jsQuery?.addHandler { jsonMessage ->
            handleMessageFromUI(jsonMessage)
            // Return empty response - actual responses are sent via postToUI
            JBCefJSQuery.Response("")
        }
    }

    /**
     * Set up load handler to inject the bridge when the page loads.
     */
    private fun setupLoadHandler() {
        browser.jbCefClient.addLoadHandler(object : CefLoadHandlerAdapter() {
            override fun onLoadEnd(cefBrowser: CefBrowser, frame: CefFrame, httpStatusCode: Int) {
                if (frame.isMain && !bridgeInjected) {
                    injectBridge()
                    bridgeInjected = true
                }
            }
        }, browser.cefBrowser)
    }

    /**
     * Inject the JavaScript bridge into the page.
     * This creates window.jbCefBrowser.postMessage() that the UI expects.
     */
    private fun injectBridge() {
        val query = jsQuery ?: run {
            LOG.warn("Cannot inject bridge: jsQuery is null")
            return
        }

        // Generate the JS code that calls our query handler
        val queryInjectCode = query.inject("msg")

        val bridgeScript = """
            (function() {
                if (window.jbCefBrowser) {
                    return;
                }

                window.jbCefBrowser = {
                    postMessage: function(msg) {
                        try {
                            $queryInjectCode
                        } catch (e) {
                            console.error('[GameScript] Query execution failed:', e);
                        }
                    }
                };

                window.dispatchEvent(new CustomEvent('gamescript-bridge-ready'));
            })();
        """.trimIndent()

        executeJavaScript(bridgeScript)
    }

    @Volatile
    private var disposed = false

    /**
     * Handle a message received from the UI.
     */
    private fun handleMessageFromUI(jsonMessage: String) {
        if (disposed) {
            return
        }
        scope.launch(Dispatchers.IO) {
            try {
                val message = JsonParser.parseString(jsonMessage).asJsonObject
                val type = message.get("type")?.asString

                if (type == null) {
                    LOG.warn("Received message without type: $jsonMessage")
                    return@launch
                }

                mediator.handle(type, message)
            } catch (e: Exception) {
                LOG.error("Error handling message from UI: $jsonMessage", e)
            }
        }
    }

    /**
     * Send a message to the UI.
     * The UI receives messages via window.addEventListener('message', handler).
     */
    fun postToUI(message: Any) {
        val json = when (message) {
            is String -> message
            is JsonObject -> message.toString()
            else -> gson.toJson(message)
        }

        val script = """
            (function() {
                var msg = $json;
                window.dispatchEvent(new MessageEvent('message', { data: msg }));
            })();
        """.trimIndent()

        executeJavaScript(script)
    }

    /**
     * Send a typed message to the UI.
     */
    fun postToUI(type: String, data: Map<String, Any?>) {
        val message = data.toMutableMap()
        message["type"] = type
        postToUI(message)
    }

    /**
     * Send a response message to the UI with the given request ID.
     */
    fun postResponse(id: String, type: String, success: Boolean, data: Map<String, Any?>? = null, error: String? = null) {
        val response = mutableMapOf<String, Any?>(
            "type" to type,
            "id" to id,
            "success" to success
        )
        if (data != null) {
            response.putAll(data)
        }
        if (error != null) {
            response["error"] = error
        }
        postToUI(response)
    }

    /**
     * Execute JavaScript in the browser context.
     *
     * CefBrowser.executeJavaScript is thread-safe and can be called from any thread.
     * Do NOT wrap in invokeLater - this causes deadlocks between EDT and CEF message loop.
     */
    private fun executeJavaScript(script: String) {
        if (browser.isDisposed) {
            return
        }
        browser.cefBrowser.executeJavaScript(script, browser.cefBrowser.url, 0)
    }

    override fun dispose() {
        scope.cancel()
        jsQuery?.dispose()
        jsQuery = null
    }

    companion object {
        private val LOG = Logger.getInstance(MessageBridge::class.java)
    }
}
