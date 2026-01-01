/**
 * VSCode theme variable mappings for GameScript UI.
 * Maps --vscode-* variables to --gs-*-override variables that theme.css uses.
 *
 * This file is shared across IDE plugins (VSCode, Rider, Visual Studio) to ensure
 * consistent theme integration.
 */

/**
 * Generate the theme styles CSS to inject into the webview.
 * This maps VSCode's theme variables to GameScript's CSS variables.
 */
export function getThemeStyles(): string {
  return `
    <style>
      :root {
        /* Typography */
        --gs-font-family-override: var(--vscode-font-family);
        --gs-font-family-mono-override: var(--vscode-editor-font-family);
        --gs-font-size-override: var(--vscode-font-size);

        /* Core Colors */
        --gs-bg-primary-override: var(--vscode-editor-background);
        --gs-bg-secondary-override: var(--vscode-sideBar-background);
        --gs-bg-tertiary-override: var(--vscode-editorWidget-background);
        --gs-bg-header-override: var(--vscode-titleBar-activeBackground);

        /* Foreground/Text Colors */
        --gs-fg-primary-override: var(--vscode-foreground);
        --gs-fg-secondary-override: var(--vscode-descriptionForeground);
        --gs-fg-link-override: var(--vscode-textLink-foreground);
        --gs-fg-error-override: var(--vscode-errorForeground);

        /* Border Colors */
        --gs-border-primary-override: var(--vscode-panel-border);
        --gs-border-secondary-override: var(--vscode-editorWidget-border);
        --gs-border-focus-override: var(--vscode-focusBorder);
        --gs-border-menu-override: var(--vscode-menu-border);

        /* Input Fields */
        --gs-input-bg-override: var(--vscode-input-background);
        --gs-input-fg-override: var(--vscode-input-foreground);
        --gs-input-border-override: var(--vscode-input-border);

        /* Dropdowns */
        --gs-dropdown-bg-override: var(--vscode-dropdown-background);
        --gs-dropdown-fg-override: var(--vscode-dropdown-foreground);
        --gs-dropdown-border-override: var(--vscode-dropdown-border);

        /* Buttons - Primary */
        --gs-button-bg-override: var(--vscode-button-background);
        --gs-button-fg-override: var(--vscode-button-foreground);
        --gs-button-hover-bg-override: var(--vscode-button-hoverBackground);

        /* Buttons - Secondary */
        --gs-button-secondary-bg-override: var(--vscode-button-secondaryBackground);
        --gs-button-secondary-fg-override: var(--vscode-button-secondaryForeground);
        --gs-button-secondary-hover-bg-override: var(--vscode-button-secondaryHoverBackground);

        /* Lists/Grids */
        --gs-list-hover-bg-override: var(--vscode-list-hoverBackground);
        --gs-list-selection-bg-override: var(--vscode-list-activeSelectionBackground);

        /* Badges */
        --gs-badge-bg-override: var(--vscode-badge-background);
        --gs-badge-fg-override: var(--vscode-badge-foreground);

        /* Menus */
        --gs-menu-bg-override: var(--vscode-menu-background);
        --gs-menu-fg-override: var(--vscode-menu-foreground);
        --gs-menu-selection-bg-override: var(--vscode-menu-selectionBackground);

        /* Toolbar */
        --gs-toolbar-hover-bg-override: var(--vscode-toolbar-hoverBackground);

        /* Validation/Feedback */
        --gs-error-bg-override: var(--vscode-inputValidation-errorBackground);
        --gs-error-border-override: var(--vscode-inputValidation-errorBorder);
        --gs-warning-bg-override: var(--vscode-inputValidation-warningBackground);
        --gs-warning-border-override: var(--vscode-inputValidation-warningBorder);

        /* Status Indicators */
        --gs-status-success-override: var(--vscode-testing-iconPassed);
        --gs-status-error-override: var(--vscode-testing-iconFailed);
      }
    </style>
    `;
}
