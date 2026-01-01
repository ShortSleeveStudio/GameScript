/**
 * Webview HTML builder.
 *
 * Generates the HTML content for the webview panel, including:
 * - Loading the built UI from dist/ui
 * - Setting up Content Security Policy
 * - Injecting VSCode theme styles
 * - Setting up the VSCode API
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { getThemeStyles } from '../theme-styles.js';

/**
 * Generate a cryptographic nonce for CSP.
 */
function getNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Build HTML content for the GameScript webview.
 */
export class WebviewHtmlBuilder {
  constructor(private readonly _extensionUri: vscode.Uri) {}

  /**
   * Get the HTML content for the webview.
   * Loads the built UI or returns a fallback if not available.
   */
  getHtml(webview: vscode.Webview): string {
    // Path to the built UI
    const uiPath = vscode.Uri.joinPath(this._extensionUri, 'dist', 'ui');
    const uiFsPath = uiPath.fsPath;

    // Read the index.html from the build
    const indexPath = path.join(uiFsPath, 'index.html');
    let html: string;

    try {
      html = fs.readFileSync(indexPath, 'utf-8');
    } catch (error) {
      // Fallback if index.html doesn't exist
      console.warn('[WebviewHtmlBuilder] Failed to read index.html, using fallback:', error);
      return this._getFallbackHtml(webview);
    }

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    // Convert relative paths to webview URIs
    const baseUri = webview.asWebviewUri(uiPath);
    html = html.replace(/"\.\/_app\//g, `"${baseUri}/_app/`);
    html = html.replace(/'\.\/_app\//g, `'${baseUri}/_app/`);
    html = html.replace(/"\/_app\//g, `"${baseUri}/_app/`);
    html = html.replace(/'\/_app\//g, `'${baseUri}/_app/`);

    // Inject VSCode theme variable mappings
    const themeStyles = getThemeStyles();

    // Inject VSCode API setup before the closing </head> tag
    const vscodeSetup = `
    <script nonce="${nonce}">
      // Make VSCode API available globally before any other scripts run
      window.vscode = acquireVsCodeApi();
    </script>
    `;
    html = html.replace('</head>', `${themeStyles}${vscodeSetup}</head>`);

    // Update Content Security Policy
    // Note: font-src needs 'data:' for AG-Grid's inline icon fonts
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'; img-src ${webview.cspSource} https: data:; font-src ${webview.cspSource} data:; connect-src ${webview.cspSource};`;

    // Add or replace CSP meta tag
    if (html.includes('<meta http-equiv="Content-Security-Policy"')) {
      html = html.replace(
        /<meta http-equiv="Content-Security-Policy"[^>]*>/,
        `<meta http-equiv="Content-Security-Policy" content="${csp}">`
      );
    } else {
      html = html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`
      );
    }

    return html;
  }

  /**
   * Get fallback HTML when the UI hasn't been built.
   */
  private _getFallbackHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>GameScript</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: var(--vscode-font-family);
        background: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
      }
      .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        text-align: center;
        padding: 2rem;
      }
      h1 { color: var(--vscode-errorForeground); }
      code { background: var(--vscode-textCodeBlock-background); padding: 0.5rem; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="error-container">
      <h1>UI Not Built</h1>
      <p>The GameScript UI has not been built yet.</p>
      <p>Run the following command:</p>
      <code>cd packages/ui && pnpm build</code>
    </div>
</body>
</html>`;
  }
}
