import * as vscode from 'vscode';
import { GameScriptPanel } from './panel.js';
import { DatabaseManager } from './database.js';
import { GameScriptSidebarProvider } from './sidebar.js';

let databaseManager: DatabaseManager | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('GameScript extension activating...');

  // Initialize managers
  databaseManager = new DatabaseManager();

  // Register sidebar webview provider (Activity Bar button)
  const sidebarProvider = new GameScriptSidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      GameScriptSidebarProvider.viewType,
      sidebarProvider
    )
  );

  // Register main editor command - opens the single GameScript panel with Golden Layout
  context.subscriptions.push(
    vscode.commands.registerCommand('gamescript.openEditor', () => {
      GameScriptPanel.createOrShow(context.extensionUri, databaseManager!);
    })
  );

  // Register undo/redo commands - forward to panel
  context.subscriptions.push(
    vscode.commands.registerCommand('gamescript.undo', () => {
      GameScriptPanel.sendToPanel({ type: 'undo' });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gamescript.redo', () => {
      GameScriptPanel.sendToPanel({ type: 'redo' });
    })
  );

  console.log('GameScript extension activated');
}

export function deactivate() {
  databaseManager?.dispose();
  databaseManager = undefined;
}
