/**
 * Security utilities for workspace path validation.
 *
 * Prevents directory traversal attacks and ensures paths stay
 * within the workspace boundaries.
 */

import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Validate that a relative path stays within the workspace.
 * Uses path.relative() to safely check containment, avoiding Windows edge cases
 * where startsWith could match similar folder prefixes (e.g., C:\workspace vs C:\workspace-other).
 *
 * @param relativePath The relative path to validate
 * @param workspaceRoot The workspace root directory
 * @throws Error if the path escapes the workspace or is absolute
 */
export function validatePathContainment(relativePath: string, workspaceRoot: string): void {
  // Reject absolute paths outright
  if (path.isAbsolute(relativePath)) {
    throw new Error(`Invalid path: absolute paths not allowed. Use relative paths within the workspace.`);
  }

  // Resolve the path against workspace root to get the canonical absolute path
  const resolved = path.resolve(workspaceRoot, relativePath);

  // Use path.relative() to check containment - this handles Windows edge cases correctly
  // If the relative path starts with '..' or is absolute, the resolved path escapes the workspace
  const relative = path.relative(workspaceRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Invalid path: "${relativePath}" escapes the workspace directory.`);
  }
}

/**
 * Validate that a conversation ID is a positive integer.
 * @throws Error if the ID is invalid
 */
export function validateConversationId(conversationId: number): void {
  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    throw new Error(`Invalid conversation ID: ${conversationId}. Must be a positive integer.`);
  }
}

/**
 * Get the first workspace folder.
 * @param operation Optional description of the operation requiring a workspace folder (for error messages)
 * @throws Error if no workspace folder is open
 */
export function getWorkspaceFolder(operation?: string): vscode.WorkspaceFolder {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    const errorMsg = operation
      ? `Cannot ${operation}: No workspace folder open`
      : 'No workspace folder open';
    throw new Error(errorMsg);
  }
  return workspaceFolder;
}

/**
 * Validate that a code output path is valid (relative, not absolute).
 *
 * @param outputPath The path to validate
 * @throws Error if the path is absolute
 */
export function validateCodeOutputPath(outputPath: string): void {
  if (path.isAbsolute(outputPath)) {
    throw new Error(
      `Invalid code output folder: "${outputPath}" is an absolute path. ` +
      `Use a relative path within the workspace.`
    );
  }
}

/**
 * Get the file path for a conversation's code file.
 * Validates that the resulting path stays within the workspace.
 *
 * @param conversationId The conversation ID (must be positive integer)
 * @param fileExtension The file extension including the dot (e.g., '.cs', '.cpp')
 * @param codeOutputFolder The relative path to the code output folder (from database settings)
 * @throws Error if conversationId is invalid, no workspace folder is open, codeOutputFolder not set, or path escapes workspace
 */
export function getConversationFilePath(
  conversationId: number,
  fileExtension: string,
  codeOutputFolder: string | undefined
): string {
  validateConversationId(conversationId);

  if (!codeOutputFolder) {
    throw new Error('Code output folder not configured. Please set it in the Inspector panel.');
  }

  validateCodeOutputPath(codeOutputFolder);

  const workspaceFolder = getWorkspaceFolder('get conversation file path');
  const workspaceRoot = workspaceFolder.uri.fsPath;

  // Build the relative path and validate it stays within workspace
  const relativePath = path.join(codeOutputFolder, `conv_${conversationId}${fileExtension}`);
  validatePathContainment(relativePath, workspaceRoot);

  // Normalize the final path to remove any redundant segments
  return path.normalize(path.join(workspaceRoot, relativePath));
}

