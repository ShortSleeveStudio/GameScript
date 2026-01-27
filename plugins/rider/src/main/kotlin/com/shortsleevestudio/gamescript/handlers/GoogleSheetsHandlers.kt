package com.shortsleevestudio.gamescript.handlers

import com.google.gson.Gson
import com.google.gson.JsonObject
import com.intellij.credentialStore.CredentialAttributes
import com.intellij.credentialStore.Credentials
import com.intellij.credentialStore.generateServiceName
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.diagnostic.Logger
import com.sun.net.httpserver.HttpServer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.InetSocketAddress
import java.net.URI
import java.net.URL
import java.net.URLEncoder
import java.security.SecureRandom
import kotlin.coroutines.resume

/**
 * Handlers for Google Sheets integration.
 *
 * Implements OAuth flow, Google Picker, and Sheets API operations.
 * Uses IntelliJ's PasswordSafe for secure credential storage.
 */
class GoogleSheetsHandlers(private val context: HandlerContext) {

    private val gson = Gson()

    // ============================================================================
    // Constants
    // ============================================================================

    companion object {
        private val LOG = Logger.getInstance(GoogleSheetsHandlers::class.java)

        // OAuth scopes
        private val GOOGLE_SCOPES = listOf(
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/userinfo.email"
        ).joinToString(" ")

        // Secret storage keys (subsystem for PasswordSafe)
        private const val SUBSYSTEM = "GameScript.GoogleSheets"
        private const val KEY_CLIENT_ID = "clientId"
        private const val KEY_CLIENT_SECRET = "clientSecret"
        private const val KEY_API_KEY = "apiKey"
        private const val KEY_ACCESS_TOKEN = "accessToken"
        private const val KEY_REFRESH_TOKEN = "refreshToken"
        private const val KEY_TOKEN_EXPIRY = "tokenExpiry"
        private const val KEY_USER_EMAIL = "userEmail"

        // Google API endpoints
        private const val GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
        private const val GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
        private const val GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
        private const val GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
        private const val GOOGLE_SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"

        // Timeout for OAuth/Picker flow (5 minutes)
        private const val AUTH_TIMEOUT_MS = 5 * 60 * 1000L
    }

    // ============================================================================
    // Handler Registration
    // ============================================================================

    fun getHandlers(): Map<String, suspend (JsonObject) -> Unit> = mapOf(
        "googleSheets:setCredentials" to ::handleSetCredentials,
        "googleSheets:getCredentials" to ::handleGetCredentials,
        "googleSheets:signIn" to ::handleSignIn,
        "googleSheets:signOut" to ::handleSignOut,
        "googleSheets:getStatus" to ::handleGetStatus,
        "googleSheets:selectSpreadsheet" to ::handleSelectSpreadsheet,
        "googleSheets:clearSpreadsheet" to ::handleClearSpreadsheet,
        "googleSheets:push" to ::handlePush,
        "googleSheets:pull" to ::handlePull
    )

    // ============================================================================
    // Credential Storage (using IntelliJ PasswordSafe)
    // ============================================================================

    private fun createCredentialAttributes(key: String): CredentialAttributes {
        return CredentialAttributes(generateServiceName(SUBSYSTEM, key))
    }

    private fun getSecret(key: String): String? {
        val attributes = createCredentialAttributes(key)
        return com.intellij.ide.passwordSafe.PasswordSafe.instance.getPassword(attributes)
    }

    private fun setSecret(key: String, value: String) {
        val attributes = createCredentialAttributes(key)
        com.intellij.ide.passwordSafe.PasswordSafe.instance.setPassword(attributes, value)
    }

    private fun deleteSecret(key: String) {
        val attributes = createCredentialAttributes(key)
        com.intellij.ide.passwordSafe.PasswordSafe.instance.setPassword(attributes, null)
    }

    // ============================================================================
    // Token Management
    // ============================================================================

    private suspend fun getAccessToken(): String? {
        val token = getSecret(KEY_ACCESS_TOKEN) ?: return null

        // Check if token is expired
        val expiryStr = getSecret(KEY_TOKEN_EXPIRY)
        if (expiryStr != null) {
            val expiry = expiryStr.toLongOrNull() ?: 0
            if (System.currentTimeMillis() >= expiry) {
                // Token expired, try to refresh
                if (refreshAccessToken()) {
                    return getSecret(KEY_ACCESS_TOKEN)
                }
                return null
            }
        }

        return token
    }

    private suspend fun refreshAccessToken(): Boolean {
        val refreshToken = getSecret(KEY_REFRESH_TOKEN) ?: return false
        val clientId = getSecret(KEY_CLIENT_ID) ?: return false
        val clientSecret = getSecret(KEY_CLIENT_SECRET) ?: return false

        return try {
            val response = httpPost(
                GOOGLE_TOKEN_URL,
                mapOf(
                    "client_id" to clientId,
                    "client_secret" to clientSecret,
                    "refresh_token" to refreshToken,
                    "grant_type" to "refresh_token"
                )
            )
            val tokens = gson.fromJson(response, TokenResponse::class.java)
            storeTokens(tokens)
            true
        } catch (e: Exception) {
            LOG.warn("Failed to refresh token", e)
            clearTokens()
            false
        }
    }

    private fun storeTokens(tokens: TokenResponse) {
        setSecret(KEY_ACCESS_TOKEN, tokens.access_token)
        if (tokens.refresh_token != null) {
            setSecret(KEY_REFRESH_TOKEN, tokens.refresh_token)
        }
        // Store expiry time (with 5 minute buffer)
        val expiry = System.currentTimeMillis() + (tokens.expires_in - 300) * 1000
        setSecret(KEY_TOKEN_EXPIRY, expiry.toString())
    }

    private suspend fun clearTokens() {
        // Attempt to revoke the token with Google (best-effort)
        val accessToken = getSecret(KEY_ACCESS_TOKEN)
        if (accessToken != null) {
            try {
                httpPost(GOOGLE_REVOKE_URL, mapOf("token" to accessToken))
            } catch (e: Exception) {
                // Revocation is best-effort
            }
        }

        deleteSecret(KEY_ACCESS_TOKEN)
        deleteSecret(KEY_REFRESH_TOKEN)
        deleteSecret(KEY_TOKEN_EXPIRY)
        deleteSecret(KEY_USER_EMAIL)
    }

    // ============================================================================
    // HTTP Helpers
    // ============================================================================

    private suspend fun httpPost(url: String, data: Map<String, String>): String = withContext(Dispatchers.IO) {
        val urlObj = URL(url)
        val connection = urlObj.openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")

            val postData = data.entries.joinToString("&") { (key, value) ->
                "${URLEncoder.encode(key, "UTF-8")}=${URLEncoder.encode(value, "UTF-8")}"
            }

            OutputStreamWriter(connection.outputStream).use { writer ->
                writer.write(postData)
            }

            if (connection.responseCode in 200..299) {
                connection.inputStream.bufferedReader().readText()
            } else {
                val error = connection.errorStream?.bufferedReader()?.readText() ?: ""
                throw Exception("HTTP ${connection.responseCode}: $error")
            }
        } finally {
            connection.disconnect()
        }
    }

    private suspend fun httpGet(url: String, accessToken: String): String = withContext(Dispatchers.IO) {
        val urlObj = URL(url)
        val connection = urlObj.openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "GET"
            connection.setRequestProperty("Authorization", "Bearer $accessToken")

            if (connection.responseCode in 200..299) {
                connection.inputStream.bufferedReader().readText()
            } else {
                val error = connection.errorStream?.bufferedReader()?.readText() ?: ""
                throw Exception("HTTP ${connection.responseCode}: $error")
            }
        } finally {
            connection.disconnect()
        }
    }

    private suspend fun httpPut(url: String, accessToken: String, data: Any): String = withContext(Dispatchers.IO) {
        val urlObj = URL(url)
        val connection = urlObj.openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "PUT"
            connection.doOutput = true
            connection.setRequestProperty("Authorization", "Bearer $accessToken")
            connection.setRequestProperty("Content-Type", "application/json")

            OutputStreamWriter(connection.outputStream).use { writer ->
                writer.write(gson.toJson(data))
            }

            if (connection.responseCode in 200..299) {
                connection.inputStream.bufferedReader().readText()
            } else {
                val error = connection.errorStream?.bufferedReader()?.readText() ?: ""
                throw Exception("HTTP ${connection.responseCode}: $error")
            }
        } finally {
            connection.disconnect()
        }
    }

    private suspend fun httpPostJson(url: String, accessToken: String, data: Any): String = withContext(Dispatchers.IO) {
        val urlObj = URL(url)
        val connection = urlObj.openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"
            connection.doOutput = true
            connection.setRequestProperty("Authorization", "Bearer $accessToken")
            connection.setRequestProperty("Content-Type", "application/json")

            OutputStreamWriter(connection.outputStream).use { writer ->
                writer.write(gson.toJson(data))
            }

            if (connection.responseCode in 200..299) {
                connection.inputStream.bufferedReader().readText()
            } else {
                val error = connection.errorStream?.bufferedReader()?.readText() ?: ""
                throw Exception("HTTP ${connection.responseCode}: $error")
            }
        } finally {
            connection.disconnect()
        }
    }

    // ============================================================================
    // OAuth Flow
    // ============================================================================

    private suspend fun startOAuthFlow(): OAuthResult {
        val clientId = getSecret(KEY_CLIENT_ID)
        val clientSecret = getSecret(KEY_CLIENT_SECRET)

        if (clientId.isNullOrEmpty() || clientSecret.isNullOrEmpty()) {
            return OAuthResult.Error("Google Sheets credentials not configured. Set them in GameScript Settings.")
        }

        val state = generateState()

        return withTimeoutOrNull(AUTH_TIMEOUT_MS) {
            suspendCancellableCoroutine { continuation ->
                var server: HttpServer? = null

                try {
                    // Create local server on random port
                    server = HttpServer.create(InetSocketAddress("localhost", 0), 0)
                    val port = server.address.port
                    val redirectUri = "http://localhost:$port/callback"

                    server.createContext("/callback") { exchange ->
                        try {
                            val query = exchange.requestURI.query ?: ""
                            val params = parseQueryString(query)

                            val code = params["code"]
                            val returnedState = params["state"]
                            val error = params["error"]

                            when {
                                error != null -> {
                                    sendHtmlResponse(exchange, 200, "<h1>Authentication failed</h1><p>You can close this window.</p>")
                                    continuation.resume(OAuthResult.Error("Google OAuth error: $error"))
                                }
                                code == null || returnedState != state -> {
                                    sendHtmlResponse(exchange, 400, "<h1>Invalid request</h1>")
                                    continuation.resume(OAuthResult.Error("Invalid OAuth callback"))
                                }
                                else -> {
                                    // Exchange code for tokens
                                    try {
                                        kotlinx.coroutines.runBlocking {
                                            val tokenResponse = httpPost(
                                                GOOGLE_TOKEN_URL,
                                                mapOf(
                                                    "client_id" to clientId,
                                                    "client_secret" to clientSecret,
                                                    "code" to code,
                                                    "grant_type" to "authorization_code",
                                                    "redirect_uri" to redirectUri
                                                )
                                            )

                                            val tokens = gson.fromJson(tokenResponse, TokenResponse::class.java)
                                            storeTokens(tokens)

                                            // Get user info
                                            val userInfoResponse = httpGet(GOOGLE_USERINFO_URL, tokens.access_token)
                                            val userInfo = gson.fromJson(userInfoResponse, UserInfo::class.java)
                                            setSecret(KEY_USER_EMAIL, userInfo.email)

                                            sendHtmlResponse(exchange, 200, "<h1>Signed in as ${userInfo.email}</h1><p>You can close this window.</p>")
                                            continuation.resume(OAuthResult.Success(userInfo.email))
                                        }
                                    } catch (e: Exception) {
                                        sendHtmlResponse(exchange, 500, "<h1>Authentication failed</h1><p>You can close this window.</p>")
                                        continuation.resume(OAuthResult.Error(e.message ?: "Token exchange failed"))
                                    }
                                }
                            }
                        } finally {
                            server?.stop(0)
                        }
                    }

                    server.executor = null
                    server.start()

                    // Build auth URL and open browser
                    val authUrl = buildString {
                        append(GOOGLE_AUTH_URL)
                        append("?client_id=").append(URLEncoder.encode(clientId, "UTF-8"))
                        append("&redirect_uri=").append(URLEncoder.encode(redirectUri, "UTF-8"))
                        append("&response_type=code")
                        append("&scope=").append(URLEncoder.encode(GOOGLE_SCOPES, "UTF-8"))
                        append("&state=").append(URLEncoder.encode(state, "UTF-8"))
                        append("&access_type=offline")
                        append("&prompt=consent")
                    }

                    BrowserUtil.browse(URI(authUrl))

                    continuation.invokeOnCancellation {
                        server?.stop(0)
                    }
                } catch (e: Exception) {
                    server?.stop(0)
                    continuation.resume(OAuthResult.Error(e.message ?: "Failed to start OAuth flow"))
                }
            }
        } ?: OAuthResult.Error("Authentication timed out")
    }

    // ============================================================================
    // Google Picker Flow
    // ============================================================================

    private suspend fun startPickerFlow(): PickerResult {
        val accessToken = getAccessToken()
        if (accessToken == null) {
            return PickerResult.Error("Not authenticated. Please sign in first.")
        }

        // Validate the token
        try {
            httpGet(GOOGLE_USERINFO_URL, accessToken)
        } catch (e: Exception) {
            clearTokens()
            return PickerResult.Error("Session expired. Please sign in again.")
        }

        val clientId = getSecret(KEY_CLIENT_ID)
        if (clientId.isNullOrEmpty()) {
            return PickerResult.Error("Google Sheets credentials not configured.")
        }

        val apiKey = getSecret(KEY_API_KEY) ?: ""

        return withTimeoutOrNull(AUTH_TIMEOUT_MS) {
            suspendCancellableCoroutine { continuation ->
                var server: HttpServer? = null

                try {
                    server = HttpServer.create(InetSocketAddress("localhost", 0), 0)
                    val port = server.address.port

                    // Serve the picker page
                    server.createContext("/") { exchange ->
                        val html = getPickerPageHtml(accessToken, clientId, apiKey, port)
                        sendHtmlResponse(exchange, 200, html)
                    }

                    // Handle callback
                    server.createContext("/callback") { exchange ->
                        try {
                            val query = exchange.requestURI.query ?: ""
                            val params = parseQueryString(query)

                            val spreadsheetId = params["id"]
                            val spreadsheetName = params["name"]
                            val cancelled = params["cancelled"]

                            when {
                                cancelled == "true" -> {
                                    sendHtmlResponse(exchange, 200, "<h1>Cancelled</h1><p>You can close this window.</p>")
                                    continuation.resume(PickerResult.Cancelled)
                                }
                                spreadsheetId != null && spreadsheetName != null -> {
                                    sendHtmlResponse(exchange, 200, "<h1>Selected: $spreadsheetName</h1><p>You can close this window.</p>")
                                    continuation.resume(
                                        PickerResult.Success(
                                            SpreadsheetInfo(
                                                id = spreadsheetId,
                                                name = java.net.URLDecoder.decode(spreadsheetName, "UTF-8"),
                                                url = "https://docs.google.com/spreadsheets/d/$spreadsheetId"
                                            )
                                        )
                                    )
                                }
                                else -> {
                                    sendHtmlResponse(exchange, 400, "Missing parameters")
                                    continuation.resume(PickerResult.Error("Missing parameters"))
                                }
                            }
                        } finally {
                            server?.stop(0)
                        }
                    }

                    server.executor = null
                    server.start()

                    BrowserUtil.browse(URI("http://localhost:$port/"))

                    continuation.invokeOnCancellation {
                        server?.stop(0)
                    }
                } catch (e: Exception) {
                    server?.stop(0)
                    continuation.resume(PickerResult.Error(e.message ?: "Failed to start picker"))
                }
            }
        } ?: PickerResult.Error("Picker timed out")
    }

    private fun getPickerPageHtml(accessToken: String, clientId: String, apiKey: String, port: Int): String {
        // Escape values for safe embedding in JavaScript
        val escapedAccessToken = gson.toJson(accessToken)
        val escapedClientId = gson.toJson(clientId)
        val escapedApiKey = gson.toJson(apiKey)

        return """
<!DOCTYPE html>
<html>
<head>
  <title>Select Spreadsheet</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
    .loading { text-align: center; margin-top: 50px; }
    .error { color: red; text-align: center; margin-top: 50px; }
    button { padding: 10px 20px; font-size: 16px; cursor: pointer; margin: 5px; }
  </style>
</head>
<body>
  <div class="loading" id="loading">
    <p>Loading Google Picker...</p>
  </div>
  <div id="error" class="error" style="display:none;">
    <p id="error-message"></p>
    <button onclick="retryLoad()">Retry</button>
    <button onclick="cancel()">Close</button>
  </div>
  <div id="buttons" style="display:none; text-align:center; margin-top:50px;">
    <button onclick="openPicker()">Open File Picker</button>
    <button onclick="cancel()">Cancel</button>
  </div>

  <script src="https://apis.google.com/js/api.js"></script>
  <script>
    const ACCESS_TOKEN = $escapedAccessToken;
    const CLIENT_ID = $escapedClientId;
    const API_KEY = $escapedApiKey;
    const CALLBACK_PORT = $port;

    let pickerApiLoaded = false;

    function loadPicker() {
      document.getElementById('loading').style.display = 'block';
      document.getElementById('error').style.display = 'none';
      document.getElementById('buttons').style.display = 'none';

      gapi.load('picker', {
        callback: () => {
          pickerApiLoaded = true;
          document.getElementById('loading').style.display = 'none';
          document.getElementById('buttons').style.display = 'block';
          openPicker();
        },
        onerror: () => {
          showError('Failed to load Google Picker API. Please check your network connection.');
        }
      });
    }

    function retryLoad() {
      pickerApiLoaded = false;
      loadPicker();
    }

    function openPicker() {
      if (!pickerApiLoaded) {
        showError('Picker not loaded yet');
        return;
      }

      try {
        const appId = CLIENT_ID.split('-')[0];

        const view = new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS)
          .setIncludeFolders(true)
          .setSelectFolderEnabled(false);

        const builder = new google.picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(ACCESS_TOKEN)
          .setAppId(appId)
          .setCallback(pickerCallback)
          .setTitle('Select a Spreadsheet');

        if (API_KEY) {
          builder.setDeveloperKey(API_KEY);
        }

        builder.setOrigin(window.location.origin);

        const picker = builder.build();
        picker.setVisible(true);
      } catch (err) {
        showError('Failed to open picker: ' + err.message);
      }
    }

    function pickerCallback(data) {
      try {
        if (data.action === google.picker.Action.PICKED) {
          if (!data.docs || data.docs.length === 0) {
            showError('No document selected');
            return;
          }
          const doc = data.docs[0];
          const callbackUrl = 'http://localhost:' + CALLBACK_PORT + '/callback?id=' +
            encodeURIComponent(doc.id) + '&name=' + encodeURIComponent(doc.name);
          window.location.href = callbackUrl;
        } else if (data.action === google.picker.Action.CANCEL) {
          cancel();
        }
      } catch (err) {
        showError('Error processing selection: ' + err.message);
      }
    }

    function cancel() {
      window.location.href = 'http://localhost:' + CALLBACK_PORT + '/callback?cancelled=true';
    }

    function showError(msg) {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('buttons').style.display = 'none';
      document.getElementById('error').style.display = 'block';
      document.getElementById('error-message').textContent = msg;
    }

    loadPicker();
  </script>
</body>
</html>
        """.trimIndent()
    }

    // ============================================================================
    // Google Sheets API Operations
    // ============================================================================

    private suspend fun getFirstSheetName(spreadsheetId: String, accessToken: String): String {
        return try {
            val url = "$GOOGLE_SHEETS_API/$spreadsheetId?fields=sheets.properties.title"
            val response = httpGet(url, accessToken)
            val metadata = gson.fromJson(response, SpreadsheetMetadata::class.java)
            metadata.sheets?.firstOrNull()?.properties?.title ?: "Sheet1"
        } catch (e: Exception) {
            "Sheet1"
        }
    }

    private suspend fun pushToSpreadsheet(spreadsheetId: String, csvData: String) {
        val accessToken = getAccessToken() ?: throw Exception("Not authenticated")

        val rows = csvTo2DArray(csvData)
        if (rows.isEmpty()) {
            throw Exception("No data to push")
        }

        val sheetName = getFirstSheetName(spreadsheetId, accessToken)

        // Clear existing data first
        val clearUrl = "$GOOGLE_SHEETS_API/$spreadsheetId/values/${URLEncoder.encode(sheetName, "UTF-8")}:clear"
        httpPostJson(clearUrl, accessToken, emptyMap<String, Any>())

        // Write new data
        val url = "$GOOGLE_SHEETS_API/$spreadsheetId/values/${URLEncoder.encode(sheetName, "UTF-8")}?valueInputOption=RAW"
        httpPut(url, accessToken, mapOf(
            "range" to sheetName,
            "majorDimension" to "ROWS",
            "values" to rows
        ))
    }

    private suspend fun pullFromSpreadsheet(spreadsheetId: String): String {
        val accessToken = getAccessToken() ?: throw Exception("Not authenticated")

        val sheetName = getFirstSheetName(spreadsheetId, accessToken)
        val url = "$GOOGLE_SHEETS_API/$spreadsheetId/values/${URLEncoder.encode(sheetName, "UTF-8")}"

        val response = httpGet(url, accessToken)
        val data = gson.fromJson(response, SheetValuesResponse::class.java)

        if (data.values.isNullOrEmpty()) {
            return ""
        }

        return array2DToCsv(data.values)
    }

    // ============================================================================
    // CSV Utilities
    // ============================================================================

    /**
     * Parse CSV content into a 2D array of strings.
     */
    private fun csvTo2DArray(content: String): List<List<String>> {
        if (content.isBlank()) return emptyList()

        val rows = mutableListOf<List<String>>()
        val reader = java.io.StringReader(content)
        val bufferedReader = java.io.BufferedReader(reader)

        var line: String?
        val currentRow = StringBuilder()
        var inQuotes = false

        while (bufferedReader.readLine().also { line = it } != null) {
            if (currentRow.isNotEmpty()) {
                currentRow.append("\n")
            }
            currentRow.append(line)

            // Count quotes to determine if we're inside a quoted field
            val quoteCount = currentRow.count { it == '"' }
            inQuotes = quoteCount % 2 != 0

            if (!inQuotes) {
                rows.add(parseCsvLine(currentRow.toString()))
                currentRow.clear()
            }
        }

        // Handle any remaining content
        if (currentRow.isNotEmpty()) {
            rows.add(parseCsvLine(currentRow.toString()))
        }

        return rows
    }

    /**
     * Parse a single CSV line into a list of values.
     */
    private fun parseCsvLine(line: String): List<String> {
        val values = mutableListOf<String>()
        val current = StringBuilder()
        var inQuotes = false
        var i = 0

        while (i < line.length) {
            val c = line[i]

            when {
                c == '"' -> {
                    if (inQuotes && i + 1 < line.length && line[i + 1] == '"') {
                        // Escaped quote
                        current.append('"')
                        i++
                    } else {
                        // Toggle quote mode
                        inQuotes = !inQuotes
                    }
                }
                c == ',' && !inQuotes -> {
                    values.add(current.toString())
                    current.clear()
                }
                else -> {
                    current.append(c)
                }
            }
            i++
        }

        values.add(current.toString())
        return values
    }

    /**
     * Convert a 2D array to CSV string.
     */
    private fun array2DToCsv(rows: List<List<String>>): String {
        return rows.joinToString("\n") { row ->
            row.joinToString(",") { value ->
                if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
                    "\"${value.replace("\"", "\"\"")}\""
                } else {
                    value
                }
            }
        }
    }

    // ============================================================================
    // Helper Functions
    // ============================================================================

    private fun generateState(): String {
        val bytes = ByteArray(16)
        SecureRandom().nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }

    private fun parseQueryString(query: String): Map<String, String> {
        return query.split("&")
            .filter { it.isNotEmpty() }
            .associate { param ->
                val parts = param.split("=", limit = 2)
                val key = java.net.URLDecoder.decode(parts[0], "UTF-8")
                val value = if (parts.size > 1) java.net.URLDecoder.decode(parts[1], "UTF-8") else ""
                key to value
            }
    }

    private fun sendHtmlResponse(exchange: com.sun.net.httpserver.HttpExchange, code: Int, html: String) {
        val bytes = html.toByteArray(Charsets.UTF_8)
        exchange.responseHeaders.add("Content-Type", "text/html; charset=utf-8")
        exchange.sendResponseHeaders(code, bytes.size.toLong())
        exchange.responseBody.use { it.write(bytes) }
    }

    // ============================================================================
    // Message Handlers
    // ============================================================================

    private suspend fun handleSetCredentials(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val clientId = message.get("clientId")?.asString ?: ""
        val clientSecret = message.get("clientSecret")?.asString ?: ""
        val apiKey = message.get("apiKey")?.asString ?: ""

        try {
            setSecret(KEY_CLIENT_ID, clientId)
            setSecret(KEY_CLIENT_SECRET, clientSecret)
            setSecret(KEY_API_KEY, apiKey)
            context.postResponse(id, "googleSheets:setCredentialsResult", true)
        } catch (e: Exception) {
            LOG.error("Failed to store credentials", e)
            context.postResponse(id, "googleSheets:setCredentialsResult", false)
        }
    }

    private suspend fun handleGetCredentials(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val clientId = getSecret(KEY_CLIENT_ID)
        val clientSecret = getSecret(KEY_CLIENT_SECRET)
        val hasCredentials = !clientId.isNullOrEmpty() && !clientSecret.isNullOrEmpty()
        context.postResponse(id, "googleSheets:getCredentialsResult", true, mapOf("hasCredentials" to hasCredentials))
    }

    private suspend fun handleSignIn(message: JsonObject) {
        val id = message.get("id")?.asString ?: return

        when (val result = startOAuthFlow()) {
            is OAuthResult.Success -> {
                context.postResponse(id, "googleSheets:signInResult", true, mapOf("email" to result.email))
            }
            is OAuthResult.Error -> {
                context.postResponse(id, "googleSheets:signInResult", false, error = result.message)
            }
        }
    }

    private suspend fun handleSignOut(message: JsonObject) {
        val id = message.get("id")?.asString ?: return

        try {
            clearTokens()
            context.postResponse(id, "googleSheets:signOutResult", true)
        } catch (e: Exception) {
            context.postResponse(id, "googleSheets:signOutResult", false, error = e.message)
        }
    }

    private suspend fun handleGetStatus(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val token = getAccessToken()
        val email = getSecret(KEY_USER_EMAIL)

        context.postResponse(id, "googleSheets:statusResult", true, mapOf(
            "authenticated" to (token != null),
            "email" to email
        ))
    }

    private suspend fun handleSelectSpreadsheet(message: JsonObject) {
        val id = message.get("id")?.asString ?: return

        when (val result = startPickerFlow()) {
            is PickerResult.Success -> {
                context.postResponse(id, "googleSheets:selectSpreadsheetResult", true, mapOf(
                    "spreadsheet" to mapOf(
                        "id" to result.spreadsheet.id,
                        "name" to result.spreadsheet.name,
                        "url" to result.spreadsheet.url
                    )
                ))
            }
            is PickerResult.Cancelled -> {
                context.postResponse(id, "googleSheets:selectSpreadsheetResult", false, error = "cancelled")
            }
            is PickerResult.Error -> {
                context.postResponse(id, "googleSheets:selectSpreadsheetResult", false, error = result.message)
            }
        }
    }

    private suspend fun handleClearSpreadsheet(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        // Nothing to do on the plugin side - spreadsheet is stored in webview localStorage
        context.postResponse(id, "googleSheets:clearSpreadsheetResult", true)
    }

    private suspend fun handlePush(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val spreadsheetId = message.get("spreadsheetId")?.asString ?: return
        val data = message.get("data")?.asString ?: return

        try {
            pushToSpreadsheet(spreadsheetId, data)
            context.postResponse(id, "googleSheets:pushResult", true)
        } catch (e: Exception) {
            LOG.error("Failed to push to spreadsheet", e)
            context.postResponse(id, "googleSheets:pushResult", false, error = e.message)
        }
    }

    private suspend fun handlePull(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val spreadsheetId = message.get("spreadsheetId")?.asString ?: return

        try {
            val data = pullFromSpreadsheet(spreadsheetId)
            context.postResponse(id, "googleSheets:pullResult", true, mapOf("data" to data))
        } catch (e: Exception) {
            LOG.error("Failed to pull from spreadsheet", e)
            context.postResponse(id, "googleSheets:pullResult", false, error = e.message)
        }
    }

    // ============================================================================
    // Data Classes
    // ============================================================================

    private data class TokenResponse(
        val access_token: String,
        val refresh_token: String?,
        val expires_in: Int,
        val token_type: String
    )

    private data class UserInfo(
        val email: String,
        val name: String?
    )

    private data class SpreadsheetInfo(
        val id: String,
        val name: String,
        val url: String
    )

    private data class SpreadsheetMetadata(
        val sheets: List<SheetInfo>?
    )

    private data class SheetInfo(
        val properties: SheetProperties?
    )

    private data class SheetProperties(
        val title: String?,
        val sheetId: Int?
    )

    private data class SheetValuesResponse(
        val values: List<List<String>>?
    )

    private sealed class OAuthResult {
        data class Success(val email: String) : OAuthResult()
        data class Error(val message: String) : OAuthResult()
    }

    private sealed class PickerResult {
        data class Success(val spreadsheet: SpreadsheetInfo) : PickerResult()
        data object Cancelled : PickerResult()
        data class Error(val message: String) : PickerResult()
    }
}
