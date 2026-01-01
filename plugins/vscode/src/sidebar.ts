import * as vscode from 'vscode';

/**
 * Sidebar webview provider for GameScript.
 *
 * Shows a simple "Open Editor" button that launches the main GameScript panel.
 * This provides quick access from the Activity Bar.
 */
export class GameScriptSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'gamescript.sidebar';

    constructor(private readonly _extensionUri: vscode.Uri) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void | Thenable<void> {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        // Check if a workspace folder is available
        const hasWorkspace = vscode.workspace.workspaceFolders !== undefined && vscode.workspace.workspaceFolders.length > 0;

        webviewView.webview.html = this._getHtmlContent(webviewView.webview, hasWorkspace);

        // Handle messages from the sidebar webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'openEditor':
                    await vscode.commands.executeCommand('gamescript.openEditor');
                    // Close the sidebar by toggling it off
                    await vscode.commands.executeCommand('workbench.action.toggleSidebarVisibility');
                    break;
            }
        });
    }

    private _getHtmlContent(_webview: vscode.Webview, hasWorkspace: boolean): string {
        const buttonDisabled = hasWorkspace ? '' : 'disabled';
        const buttonClass = hasWorkspace ? 'open-button' : 'open-button disabled';
        const noWorkspaceWarning = hasWorkspace ? '' : `
            <div class="warning">
                <span class="warning-icon">⚠️</span>
                <span>Open a folder to use GameScript</span>
            </div>
        `;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GameScript</title>
    <style>
        body {
            padding: 12px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
        }

        .container {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }

        .header-icon {
            font-size: 24px;
        }

        .header-title {
            font-size: 14px;
            font-weight: 600;
        }

        .description {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.4;
            margin-bottom: 8px;
        }

        .warning {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            font-size: 12px;
            color: var(--vscode-editorWarning-foreground);
            background: var(--vscode-editorWarning-background, rgba(255, 204, 0, 0.1));
            border: 1px solid var(--vscode-editorWarning-border, var(--vscode-editorWarning-foreground));
            border-radius: 4px;
        }

        .warning-icon {
            font-size: 14px;
        }

        .open-button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            width: 100%;
            padding: 8px 12px;
            font-size: 13px;
            font-weight: 500;
            color: var(--vscode-button-foreground);
            background: var(--vscode-button-background);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        .open-button:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }

        .open-button:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: 2px;
        }

        .open-button.disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .shortcuts {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid var(--vscode-widget-border);
        }

        .shortcuts-title {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
        }

        .shortcut {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            padding: 4px 0;
        }

        .shortcut-key {
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            padding: 2px 6px;
            background: var(--vscode-textBlockQuote-background);
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span class="header-icon">💬</span>
            <span class="header-title">GameScript</span>
        </div>

        <p class="description">
            Visual dialogue authoring for games. Create branching conversations with conditions and actions.
        </p>

        ${noWorkspaceWarning}

        <button class="${buttonClass}" onclick="openEditor()" ${buttonDisabled}>
            <span>Open Editor</span>
        </button>

        <div class="shortcuts">
            <div class="shortcuts-title">Quick Actions</div>
            <div class="shortcut">
                <span>Undo</span>
                <span class="shortcut-key">Ctrl+Z</span>
            </div>
            <div class="shortcut">
                <span>Redo</span>
                <span class="shortcut-key">Ctrl+Shift+Z</span>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function openEditor() {
            vscode.postMessage({ type: 'openEditor' });
        }
    </script>
</body>
</html>`;
    }
}
