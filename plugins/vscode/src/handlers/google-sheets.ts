/**
 * Google Sheets authentication and API handlers.
 *
 * Handles Google Sheets messages from the webview:
 * - 'googleSheets:signIn' - Initiate OAuth flow
 * - 'googleSheets:signOut' - Clear stored tokens
 * - 'googleSheets:getStatus' - Check authentication status
 * - 'googleSheets:selectSpreadsheet' - Open Google Picker
 * - 'googleSheets:clearSpreadsheet' - Clear selected spreadsheet
 * - 'googleSheets:push' - Push data to spreadsheet
 * - 'googleSheets:pull' - Pull data from spreadsheet
 *
 * Uses VS Code SecretStorage for secure OAuth token storage.
 * OAuth and Picker flows open the system browser with localhost redirect.
 */

import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import * as crypto from 'crypto';
import {
	csvTo2DArray,
	array2DToCsv,
	type GoogleSheetsSetCredentialsMessage,
	type GoogleSheetsGetCredentialsMessage,
	type GoogleSheetsSignInMessage,
	type GoogleSheetsSignOutMessage,
	type GoogleSheetsGetStatusMessage,
	type GoogleSheetsSelectSpreadsheetMessage,
	type GoogleSheetsClearSpreadsheetMessage,
	type GoogleSheetsPushMessage,
	type GoogleSheetsPullMessage,
	type GoogleSheetsSpreadsheetInfo,
} from '@gamescript/shared';
import type { HandlerRecord, PostMessageFn } from './types.js';

// ============================================================================
// Constants
// ============================================================================

/** OAuth scopes required for Google Sheets and Picker */
const GOOGLE_SCOPES = [
	'https://www.googleapis.com/auth/spreadsheets',
	'https://www.googleapis.com/auth/drive.readonly',  // Picker needs this to list files
	'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

/** Secret storage keys for API credentials */
const SECRET_CLIENT_ID = 'gamescript.googleSheets.clientId';
const SECRET_CLIENT_SECRET = 'gamescript.googleSheets.clientSecret';
const SECRET_API_KEY = 'gamescript.googleSheets.apiKey';

/** Secret storage keys for OAuth tokens */
const SECRET_ACCESS_TOKEN = 'gamescript.googleSheets.accessToken';
const SECRET_REFRESH_TOKEN = 'gamescript.googleSheets.refreshToken';
const SECRET_TOKEN_EXPIRY = 'gamescript.googleSheets.tokenExpiry';
const SECRET_USER_EMAIL = 'gamescript.googleSheets.userEmail';

/** Google API endpoints */
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

/** Timeout for OAuth/Picker flow (5 minutes) */
const AUTH_TIMEOUT_MS = 5 * 60 * 1000;

// ============================================================================
// Types
// ============================================================================

interface TokenResponse {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
	token_type: string;
}

interface UserInfo {
	email: string;
	name?: string;
}

/**
 * Safely get the port from an HTTP server.
 * Returns undefined if server is not listening or address is not available.
 */
function getServerPort(server: http.Server | undefined): number | undefined {
	if (!server) return undefined;
	const address = server.address();
	if (!address || typeof address === 'string') return undefined;
	return address.port;
}

// ============================================================================
// Google Sheets Handlers Class
// ============================================================================

/**
 * Create handlers for Google Sheets messages.
 * @param secrets VS Code SecretStorage for token persistence
 * @param postMessage Function to send messages back to the webview
 */
export function createGoogleSheetsHandlers(
	secrets: vscode.SecretStorage,
	postMessage: PostMessageFn
): HandlerRecord {
	// ============================================================================
	// Token Management
	// ============================================================================

	async function getAccessToken(): Promise<string | undefined> {
		const token = await secrets.get(SECRET_ACCESS_TOKEN);
		if (!token) return undefined;

		// Check if token is expired
		const expiryStr = await secrets.get(SECRET_TOKEN_EXPIRY);
		if (expiryStr) {
			const expiry = parseInt(expiryStr, 10);
			if (Date.now() >= expiry) {
				// Token expired, try to refresh
				const refreshed = await refreshAccessToken();
				if (refreshed) {
					return await secrets.get(SECRET_ACCESS_TOKEN);
				}
				return undefined;
			}
		}

		return token;
	}

	async function refreshAccessToken(): Promise<boolean> {
		const refreshToken = await secrets.get(SECRET_REFRESH_TOKEN);
		if (!refreshToken) return false;

		// Get client credentials from SecretStorage
		const clientId = await secrets.get(SECRET_CLIENT_ID);
		const clientSecret = await secrets.get(SECRET_CLIENT_SECRET);

		if (!clientId || !clientSecret) {
			return false;
		}

		try {
			const response = await httpPost(GOOGLE_TOKEN_URL, {
				client_id: clientId,
				client_secret: clientSecret,
				refresh_token: refreshToken,
				grant_type: 'refresh_token',
			});

			const tokens = JSON.parse(response) as TokenResponse;
			await storeTokens(tokens);
			return true;
		} catch {
			// Refresh failed, clear tokens
			await clearTokens();
			return false;
		}
	}

	async function storeTokens(tokens: TokenResponse): Promise<void> {
		await secrets.store(SECRET_ACCESS_TOKEN, tokens.access_token);
		if (tokens.refresh_token) {
			await secrets.store(SECRET_REFRESH_TOKEN, tokens.refresh_token);
		}
		// Store expiry time (with 5 minute buffer)
		const expiry = Date.now() + (tokens.expires_in - 300) * 1000;
		await secrets.store(SECRET_TOKEN_EXPIRY, expiry.toString());
	}

	/**
	 * Revoke the OAuth token with Google.
	 * Best-effort - doesn't throw on failure.
	 */
	async function revokeToken(token: string): Promise<void> {
		try {
			await httpPost(GOOGLE_REVOKE_URL, { token });
		} catch {
			// Revocation is best-effort - token may already be invalid
		}
	}

	async function clearTokens(): Promise<void> {
		// Attempt to revoke the token with Google (best-effort)
		const accessToken = await secrets.get(SECRET_ACCESS_TOKEN);
		if (accessToken) {
			await revokeToken(accessToken);
		}

		await secrets.delete(SECRET_ACCESS_TOKEN);
		await secrets.delete(SECRET_REFRESH_TOKEN);
		await secrets.delete(SECRET_TOKEN_EXPIRY);
		await secrets.delete(SECRET_USER_EMAIL);
	}

	// ============================================================================
	// HTTP Helpers
	// ============================================================================

	interface HttpRequestOptions {
		method: 'GET' | 'POST' | 'PUT';
		url: string;
		body?: string;
		contentType?: string;
		accessToken?: string;
	}

	function httpRequest(options: HttpRequestOptions): Promise<string> {
		return new Promise((resolve, reject) => {
			const urlObj = new URL(options.url);

			const headers: Record<string, string | number> = {};
			if (options.accessToken) {
				headers['Authorization'] = `Bearer ${options.accessToken}`;
			}
			if (options.contentType) {
				headers['Content-Type'] = options.contentType;
			}
			if (options.body) {
				headers['Content-Length'] = Buffer.byteLength(options.body);
			}

			const reqOptions: https.RequestOptions = {
				hostname: urlObj.hostname,
				path: urlObj.pathname + urlObj.search,
				method: options.method,
				headers,
			};

			const req = https.request(reqOptions, (res) => {
				let responseData = '';
				res.on('data', (chunk) => (responseData += chunk));
				res.on('end', () => {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						resolve(responseData);
					} else {
						reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
					}
				});
			});

			req.on('error', reject);
			if (options.body) {
				req.write(options.body);
			}
			req.end();
		});
	}

	function httpPost(url: string, data: Record<string, string>): Promise<string> {
		return httpRequest({
			method: 'POST',
			url,
			body: new URLSearchParams(data).toString(),
			contentType: 'application/x-www-form-urlencoded',
		});
	}

	function httpGet(url: string, accessToken: string): Promise<string> {
		return httpRequest({
			method: 'GET',
			url,
			accessToken,
		});
	}

	function httpPut(url: string, accessToken: string, data: unknown): Promise<string> {
		return httpRequest({
			method: 'PUT',
			url,
			body: JSON.stringify(data),
			contentType: 'application/json',
			accessToken,
		});
	}

	// ============================================================================
	// OAuth Flow
	// ============================================================================

	async function startOAuthFlow(): Promise<{ email: string } | { error: string }> {
		// Get client credentials from SecretStorage
		const clientId = await secrets.get(SECRET_CLIENT_ID);
		const clientSecret = await secrets.get(SECRET_CLIENT_SECRET);

		if (!clientId || !clientSecret) {
			return {
				error: 'Google Sheets credentials not configured. Set them in GameScript Settings.',
			};
		}

		return new Promise((resolve) => {
			const state = crypto.randomBytes(16).toString('hex');
			let server: http.Server | undefined;
			let timeout: NodeJS.Timeout | undefined;

			const cleanup = () => {
				if (timeout) clearTimeout(timeout);
				if (server) {
					server.close();
					server = undefined;
				}
			};

			// Set up timeout
			timeout = setTimeout(() => {
				cleanup();
				resolve({ error: 'Authentication timed out' });
			}, AUTH_TIMEOUT_MS);

			// Create local server to receive OAuth callback
			server = http.createServer(async (req, res) => {
				if (!req.url?.startsWith('/callback')) {
					res.writeHead(404);
					res.end('Not found');
					return;
				}

				const url = new URL(req.url, `http://localhost`);
				const code = url.searchParams.get('code');
				const returnedState = url.searchParams.get('state');
				const error = url.searchParams.get('error');

				if (error) {
					res.writeHead(200, { 'Content-Type': 'text/html' });
					res.end('<html><body><h1>Authentication failed</h1><p>You can close this window.</p></body></html>');
					cleanup();
					resolve({ error: `Google OAuth error: ${error}` });
					return;
				}

				if (!code || returnedState !== state) {
					res.writeHead(400, { 'Content-Type': 'text/html' });
					res.end('<html><body><h1>Invalid request</h1></body></html>');
					cleanup();
					resolve({ error: 'Invalid OAuth callback' });
					return;
				}

				// Exchange code for tokens
				try {
					const port = getServerPort(server);
					if (!port) {
						res.writeHead(500, { 'Content-Type': 'text/html' });
						res.end('<html><body><h1>Server error</h1><p>You can close this window.</p></body></html>');
						cleanup();
						resolve({ error: 'Failed to determine server port' });
						return;
					}
					const redirectUri = `http://localhost:${port}/callback`;

					const tokenResponse = await httpPost(GOOGLE_TOKEN_URL, {
						client_id: clientId,
						client_secret: clientSecret,
						code,
						grant_type: 'authorization_code',
						redirect_uri: redirectUri,
					});

					const tokens = JSON.parse(tokenResponse) as TokenResponse;
					await storeTokens(tokens);

					// Get user info
					const userInfoResponse = await httpGet(GOOGLE_USERINFO_URL, tokens.access_token);
					const userInfo = JSON.parse(userInfoResponse) as UserInfo;
					await secrets.store(SECRET_USER_EMAIL, userInfo.email);

					res.writeHead(200, { 'Content-Type': 'text/html' });
					res.end(`<html><body><h1>Signed in as ${userInfo.email}</h1><p>You can close this window.</p></body></html>`);
					cleanup();
					resolve({ email: userInfo.email });
				} catch (err) {
					res.writeHead(500, { 'Content-Type': 'text/html' });
					res.end('<html><body><h1>Authentication failed</h1><p>You can close this window.</p></body></html>');
					cleanup();
					resolve({ error: err instanceof Error ? err.message : 'Token exchange failed' });
				}
			});

			// Start server on random port
			server.listen(0, 'localhost', () => {
				const port = getServerPort(server);
				const redirectUri = `http://localhost:${port}/callback`;

				const authUrl = new URL(GOOGLE_AUTH_URL);
				authUrl.searchParams.set('client_id', clientId);
				authUrl.searchParams.set('redirect_uri', redirectUri);
				authUrl.searchParams.set('response_type', 'code');
				authUrl.searchParams.set('scope', GOOGLE_SCOPES);
				authUrl.searchParams.set('state', state);
				authUrl.searchParams.set('access_type', 'offline');
				authUrl.searchParams.set('prompt', 'consent');

				// Open browser
				vscode.env.openExternal(vscode.Uri.parse(authUrl.toString()));
			});

			server.on('error', (err) => {
				cleanup();
				resolve({ error: err.message });
			});
		});
	}

	// ============================================================================
	// Google Picker Flow
	// ============================================================================

	async function startPickerFlow(): Promise<GoogleSheetsSpreadsheetInfo | { error: string }> {
		const accessToken = await getAccessToken();
		if (!accessToken) {
			return { error: 'Not authenticated. Please sign in first.' };
		}

		// Validate the token is still valid by making a quick API call
		try {
			await httpGet(GOOGLE_USERINFO_URL, accessToken);
		} catch {
			// Token is invalid, clear it and ask user to sign in again
			await clearTokens();
			return { error: 'Session expired. Please sign in again.' };
		}

		// Get credentials from SecretStorage
		const clientId = await secrets.get(SECRET_CLIENT_ID);
		const apiKey = await secrets.get(SECRET_API_KEY);

		if (!clientId) {
			return { error: 'Google Sheets credentials not configured.' };
		}

		return new Promise((resolve) => {
			let server: http.Server | undefined;
			let timeout: NodeJS.Timeout | undefined;

			const cleanup = () => {
				if (timeout) clearTimeout(timeout);
				if (server) {
					server.close();
					server = undefined;
				}
			};

			timeout = setTimeout(() => {
				cleanup();
				resolve({ error: 'Picker timed out' });
			}, AUTH_TIMEOUT_MS);

			server = http.createServer(async (req, res) => {
				const url = new URL(req.url || '/', `http://localhost`);

				if (url.pathname === '/') {
					// Serve the picker page
					const port = getServerPort(server);
					if (!port) {
						res.writeHead(500, { 'Content-Type': 'text/html' });
						res.end('<html><body><h1>Server error</h1><p>Failed to determine server port.</p></body></html>');
						return;
					}
					const html = getPickerPageHtml(accessToken, clientId, apiKey || '', port);
					res.writeHead(200, { 'Content-Type': 'text/html' });
					res.end(html);
					return;
				}

				if (url.pathname === '/callback') {
					const spreadsheetId = url.searchParams.get('id');
					const spreadsheetName = url.searchParams.get('name');
					const cancelled = url.searchParams.get('cancelled');

					if (cancelled === 'true') {
						res.writeHead(200, { 'Content-Type': 'text/html' });
						res.end('<html><body><h1>Cancelled</h1><p>You can close this window.</p></body></html>');
						cleanup();
						resolve({ error: 'cancelled' });
						return;
					}

					if (spreadsheetId && spreadsheetName) {
						res.writeHead(200, { 'Content-Type': 'text/html' });
						res.end(`<html><body><h1>Selected: ${spreadsheetName}</h1><p>You can close this window.</p></body></html>`);
						cleanup();
						resolve({
							id: spreadsheetId,
							name: decodeURIComponent(spreadsheetName),
							url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
						});
						return;
					}

					res.writeHead(400);
					res.end('Missing parameters');
					return;
				}

				res.writeHead(404);
				res.end('Not found');
			});

			server.listen(0, 'localhost', () => {
				const port = getServerPort(server);
				vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}/`));
			});

			server.on('error', (err) => {
				cleanup();
				resolve({ error: err.message });
			});
		});
	}

	function getPickerPageHtml(accessToken: string, clientId: string, apiKey: string, port: number): string {
		// Use JSON.stringify to safely escape values for JavaScript
		return `<!DOCTYPE html>
<html>
<head>
  <title>Select Spreadsheet</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
    .loading { text-align: center; margin-top: 50px; }
    .error { color: red; text-align: center; margin-top: 50px; }
    .error-message { margin-bottom: 20px; }
    button { padding: 10px 20px; font-size: 16px; cursor: pointer; margin: 5px; }
    .button-group { margin-top: 20px; }
  </style>
</head>
<body>
  <div class="loading" id="loading">
    <p>Loading Google Picker...</p>
  </div>
  <div id="error" class="error" style="display:none;">
    <p class="error-message" id="error-message"></p>
    <div class="button-group">
      <button onclick="retryLoad()">Retry</button>
      <button onclick="cancel()">Close</button>
    </div>
  </div>
  <div id="buttons" style="display:none; text-align:center; margin-top:50px;">
    <button onclick="openPicker()">Open File Picker</button>
    <button onclick="cancel()">Cancel</button>
  </div>

  <script src="https://apis.google.com/js/api.js"></script>
  <script>
    const ACCESS_TOKEN = ${JSON.stringify(accessToken)};
    const CLIENT_ID = ${JSON.stringify(clientId)};
    const API_KEY = ${JSON.stringify(apiKey)};
    const CALLBACK_PORT = ${port};

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
          // Auto-open picker
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
        // Extract App ID (project number) from Client ID
        // Client ID format: {project_number}-{random}.apps.googleusercontent.com
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

        // API key enables additional features but is optional
        if (API_KEY) {
          builder.setDeveloperKey(API_KEY);
        }

        // Set origin for postMessage communication - MUST match exactly
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
        // Ignore 'loaded' and other actions
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

    // Start loading
    loadPicker();
  </script>
</body>
</html>`;
	}

	// ============================================================================
	// Google Sheets API Operations
	// ============================================================================

	interface SpreadsheetMetadata {
		sheets?: Array<{
			properties?: {
				title?: string;
				sheetId?: number;
			};
		}>;
	}

	/**
	 * Get the name of the first sheet in a spreadsheet.
	 * Returns 'Sheet1' as fallback if metadata cannot be retrieved.
	 */
	async function getFirstSheetName(spreadsheetId: string, accessToken: string): Promise<string> {
		try {
			const url = `${GOOGLE_SHEETS_API}/${spreadsheetId}?fields=sheets.properties.title`;
			const response = await httpGet(url, accessToken);
			const metadata = JSON.parse(response) as SpreadsheetMetadata;

			const firstSheet = metadata.sheets?.[0]?.properties?.title;
			return firstSheet || 'Sheet1';
		} catch {
			// Fall back to 'Sheet1' if we can't get metadata
			return 'Sheet1';
		}
	}

	async function pushToSpreadsheet(spreadsheetId: string, csvData: string): Promise<void> {
		const accessToken = await getAccessToken();
		if (!accessToken) {
			throw new Error('Not authenticated');
		}

		// Parse CSV to 2D array using shared utility
		const rows = csvTo2DArray(csvData);
		if (rows.length === 0) {
			throw new Error('No data to push');
		}

		// Get the actual first sheet name
		const sheetName = await getFirstSheetName(spreadsheetId, accessToken);

		// Clear existing data first to remove any orphaned rows from deleted localizations
		const clearUrl = `${GOOGLE_SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:clear`;
		await httpRequest({
			method: 'POST',
			url: clearUrl,
			body: '{}',
			contentType: 'application/json',
			accessToken,
		});

		// Write new data
		const url = `${GOOGLE_SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?valueInputOption=RAW`;

		await httpPut(url, accessToken, {
			range: sheetName,
			majorDimension: 'ROWS',
			values: rows,
		});
	}

	async function pullFromSpreadsheet(spreadsheetId: string): Promise<string> {
		const accessToken = await getAccessToken();
		if (!accessToken) {
			throw new Error('Not authenticated');
		}

		// Get the actual first sheet name
		const sheetName = await getFirstSheetName(spreadsheetId, accessToken);
		const url = `${GOOGLE_SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;

		const response = await httpGet(url, accessToken);
		const data = JSON.parse(response) as { values?: string[][] };

		if (!data.values || data.values.length === 0) {
			return '';
		}

		// Convert 2D array back to CSV using shared utility
		return array2DToCsv(data.values);
	}

	// ============================================================================
	// Message Handlers
	// ============================================================================

	return {
		'googleSheets:setCredentials': async (message) => {
			const { id, clientId, clientSecret, apiKey } = message as GoogleSheetsSetCredentialsMessage;

			try {
				// Store credentials in SecretStorage
				await secrets.store(SECRET_CLIENT_ID, clientId);
				await secrets.store(SECRET_CLIENT_SECRET, clientSecret);
				// API key is optional but still store it (may be empty string)
				await secrets.store(SECRET_API_KEY, apiKey || '');

				postMessage({
					type: 'googleSheets:setCredentialsResult',
					id,
					success: true,
				});
			} catch (err) {
				postMessage({
					type: 'googleSheets:setCredentialsResult',
					id,
					success: false,
				});
			}
		},

		'googleSheets:getCredentials': async (message) => {
			const { id } = message as GoogleSheetsGetCredentialsMessage;

			// Check if credentials exist (don't return actual values)
			const clientId = await secrets.get(SECRET_CLIENT_ID);
			const clientSecret = await secrets.get(SECRET_CLIENT_SECRET);

			postMessage({
				type: 'googleSheets:getCredentialsResult',
				id,
				hasCredentials: !!(clientId && clientSecret),
			});
		},

		'googleSheets:signIn': async (message) => {
			const { id } = message as GoogleSheetsSignInMessage;

			const result = await startOAuthFlow();

			if ('error' in result) {
				postMessage({
					type: 'googleSheets:signInResult',
					id,
					success: false,
					error: result.error,
				});
			} else {
				postMessage({
					type: 'googleSheets:signInResult',
					id,
					success: true,
					email: result.email,
				});
				// Note: Auth state change is emitted by the bridge when processing signInResult
			}
		},

		'googleSheets:signOut': async (message) => {
			const { id } = message as GoogleSheetsSignOutMessage;

			try {
				await clearTokens();
				postMessage({
					type: 'googleSheets:signOutResult',
					id,
					success: true,
				});
				// Note: Auth state change is emitted by the bridge when processing signOutResult
			} catch (err) {
				postMessage({
					type: 'googleSheets:signOutResult',
					id,
					success: false,
					error: err instanceof Error ? err.message : 'Sign out failed',
				});
			}
		},

		'googleSheets:getStatus': async (message) => {
			const { id } = message as GoogleSheetsGetStatusMessage;

			const token = await getAccessToken();
			const email = await secrets.get(SECRET_USER_EMAIL);

			postMessage({
				type: 'googleSheets:statusResult',
				id,
				authenticated: !!token,
				email: email || undefined,
			});
		},

		'googleSheets:selectSpreadsheet': async (message) => {
			const { id } = message as GoogleSheetsSelectSpreadsheetMessage;

			const result = await startPickerFlow();

			if ('error' in result) {
				postMessage({
					type: 'googleSheets:selectSpreadsheetResult',
					id,
					success: false,
					error: result.error,
				});
			} else {
				postMessage({
					type: 'googleSheets:selectSpreadsheetResult',
					id,
					success: true,
					spreadsheet: result,
				});
			}
		},

		'googleSheets:clearSpreadsheet': async (message) => {
			const { id } = message as GoogleSheetsClearSpreadsheetMessage;

			// Nothing to do on the extension side - spreadsheet is stored in webview localStorage
			postMessage({
				type: 'googleSheets:clearSpreadsheetResult',
				id,
				success: true,
			});
		},

		'googleSheets:push': async (message) => {
			const { id, spreadsheetId, data } = message as GoogleSheetsPushMessage;

			try {
				await pushToSpreadsheet(spreadsheetId, data);
				postMessage({
					type: 'googleSheets:pushResult',
					id,
					success: true,
				});
			} catch (err) {
				postMessage({
					type: 'googleSheets:pushResult',
					id,
					success: false,
					error: err instanceof Error ? err.message : 'Push failed',
				});
			}
		},

		'googleSheets:pull': async (message) => {
			const { id, spreadsheetId } = message as GoogleSheetsPullMessage;

			try {
				const data = await pullFromSpreadsheet(spreadsheetId);
				postMessage({
					type: 'googleSheets:pullResult',
					id,
					success: true,
					data,
				});
			} catch (err) {
				postMessage({
					type: 'googleSheets:pullResult',
					id,
					success: false,
					error: err instanceof Error ? err.message : 'Pull failed',
				});
			}
		},
	};
}
