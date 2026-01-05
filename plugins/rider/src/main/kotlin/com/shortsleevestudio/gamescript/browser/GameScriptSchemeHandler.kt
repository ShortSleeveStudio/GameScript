package com.shortsleevestudio.gamescript.browser

import org.cef.callback.CefCallback
import org.cef.handler.CefResourceHandlerAdapter
import org.cef.misc.IntRef
import org.cef.misc.StringRef
import org.cef.network.CefRequest
import org.cef.network.CefResponse
import java.io.InputStream
import java.net.URI

/**
 * Resource handler for serving GameScript UI files from the plugin JAR.
 * Used by GameScriptBrowserPanel to intercept HTTPS requests and serve
 * bundled resources, enabling ES module support.
 *
 * URLs are formatted as: https://gamescript-ui.local/path/to/file
 * Files are loaded from the plugin's bundled resources at /ui/
 */
class GameScriptSchemeHandler : CefResourceHandlerAdapter() {

    private var inputStream: InputStream? = null
    private var mimeType: String = "text/html"
    private var responseLength: Int = -1

    override fun processRequest(request: CefRequest, callback: CefCallback): Boolean {
        val url = request.url ?: return false

        try {
            val uri = URI(url)
            val path = uri.path?.removePrefix("/") ?: "index.html"
            val resourcePath = "/ui/${path.ifEmpty { "index.html" }}"

            // Load from plugin resources
            inputStream = javaClass.getResourceAsStream(resourcePath)

            if (inputStream == null) {
                callback.cancel()
                return false
            }

            // Determine MIME type from extension
            mimeType = getMimeType(path)

            // Get content length
            responseLength = inputStream?.available() ?: -1

            callback.Continue()
            return true
        } catch (_: Exception) {
            callback.cancel()
            return false
        }
    }

    override fun getResponseHeaders(
        response: CefResponse,
        responseLength: IntRef,
        redirectUrl: StringRef
    ) {
        response.status = 200
        response.mimeType = mimeType
        responseLength.set(this.responseLength)
    }

    override fun readResponse(
        dataOut: ByteArray,
        bytesToRead: Int,
        bytesRead: IntRef,
        callback: CefCallback
    ): Boolean {
        val stream = inputStream ?: return false

        return try {
            val read = stream.read(dataOut, 0, bytesToRead)
            if (read <= 0) {
                bytesRead.set(0)
                stream.close()
                inputStream = null
                false
            } else {
                bytesRead.set(read)
                true
            }
        } catch (_: Exception) {
            bytesRead.set(0)
            false
        }
    }

    override fun cancel() {
        try {
            inputStream?.close()
        } catch (_: Exception) {
            // Ignore close errors
        }
        inputStream = null
    }

    private fun getMimeType(path: String): String {
        val extension = path.substringAfterLast('.', "")
        return when (extension.lowercase()) {
            "html", "htm" -> "text/html"
            "js", "mjs" -> "application/javascript"
            "css" -> "text/css"
            "json" -> "application/json"
            "svg" -> "image/svg+xml"
            "png" -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            "gif" -> "image/gif"
            "ico" -> "image/x-icon"
            "woff" -> "font/woff"
            "woff2" -> "font/woff2"
            "ttf" -> "font/ttf"
            "otf" -> "font/otf"
            "eot" -> "application/vnd.ms-fontobject"
            "map" -> "application/json"
            else -> "application/octet-stream"
        }
    }
}
