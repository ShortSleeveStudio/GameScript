package com.shortsleevestudio.gamescript.theme

import com.intellij.openapi.editor.colors.EditorColorsManager
import com.intellij.ui.ColorUtil
import com.intellij.ui.JBColor
import java.awt.Color

/**
 * Maps Rider theme colors to CSS custom properties for the UI.
 * Injects theme styles into the webview to match IDE appearance.
 *
 * Uses JBColor.namedColor for future-proof theme compatibility.
 */
class ThemeMapper {

    /**
     * Generate CSS style block with theme variables.
     */
    fun getThemeStyles(): String {
        val scheme = EditorColorsManager.getInstance().globalScheme
        val isDark = isDarkTheme()

        return """
            <style id="gamescript-theme">
                :root {
                    /* Typography */
                    --gs-font-family-override: '${scheme.editorFontName}', 'JetBrains Mono', monospace;
                    --gs-font-size-override: ${scheme.editorFontSize}px;

                    /* Core Background Colors */
                    --gs-bg-primary-override: ${hex(scheme.defaultBackground)};
                    --gs-bg-secondary-override: ${hex(namedColor("ToolWindow.background", 0xf7f8fa, 0x3c3f41))};
                    --gs-bg-tertiary-override: ${hex(namedColor("List.background", 0xffffff, 0x3c3f41))};

                    /* Foreground Colors */
                    --gs-fg-primary-override: ${hex(scheme.defaultForeground)};
                    --gs-fg-secondary-override: ${hex(namedColor("Label.disabledForeground", 0x8c8c8c, 0x777777))};
                    --gs-fg-muted-override: ${hex(namedColor("Component.infoForeground", 0x999999, 0x787878))};

                    /* Border Colors */
                    --gs-border-primary-override: ${hex(namedColor("Component.borderColor", 0xc4c4c4, 0x5e5e5e))};
                    --gs-border-focus-override: ${hex(namedColor("Component.focusColor", 0x87afda, 0x466d94))};

                    /* Input Colors */
                    --gs-input-bg-override: ${hex(namedColor("TextField.background", 0xffffff, 0x45494a))};
                    --gs-input-fg-override: ${hex(namedColor("TextField.foreground", 0x000000, 0xbbbbbb))};
                    --gs-input-border-override: ${hex(namedColor("Component.borderColor", 0xc4c4c4, 0x5e5e5e))};

                    /* Button Colors */
                    --gs-button-bg-override: ${hex(namedColor("Button.default.startBackground", 0x528cc7, 0x365880))};
                    --gs-button-fg-override: ${hex(namedColor("Button.foreground", 0x000000, 0xbbbbbb))};
                    --gs-button-hover-bg-override: ${hex(namedColor("ActionButton.hoverBackground", 0xdfdfdf, 0x4c5052))};

                    /* List/Selection Colors */
                    --gs-list-hover-bg-override: ${hex(namedColor("List.hoverBackground", 0xedf5fc, 0x464a4d))};
                    --gs-list-selection-bg-override: ${hex(namedColor("List.selectionBackground", 0x2675bf, 0x2f5c92))};
                    --gs-list-selection-fg-override: ${hex(namedColor("List.selectionForeground", 0xffffff, 0xffffff))};

                    /* Status Colors */
                    --gs-success-override: ${if (isDark) "#4caf50" else "#2e7d32"};
                    --gs-warning-override: ${if (isDark) "#ff9800" else "#f57c00"};
                    --gs-error-override: ${if (isDark) "#f44336" else "#d32f2f"};
                    --gs-info-override: ${if (isDark) "#2196f3" else "#1976d2"};

                    /* Link Colors */
                    --gs-link-override: ${hex(namedColor("Link.activeForeground", 0x2470b3, 0x589df6))};

                    /* Scrollbar */
                    --gs-scrollbar-thumb-override: ${if (isDark) "rgba(255,255,255,0.2)" else "rgba(0,0,0,0.2)"};
                    --gs-scrollbar-track-override: transparent;
                }
            </style>
        """.trimIndent()
    }

    /**
     * Check if the current theme is dark.
     */
    fun isDarkTheme(): Boolean {
        val scheme = EditorColorsManager.getInstance().globalScheme
        val bg = scheme.defaultBackground
        return isColorDark(bg)
    }

    private fun isColorDark(color: Color): Boolean {
        val brightness = (color.red * 299 + color.green * 587 + color.blue * 114) / 1000
        return brightness < 128
    }

    /**
     * Get a named color with light/dark fallbacks.
     */
    private fun namedColor(key: String, light: Int, dark: Int): Color {
        return JBColor.namedColor(key, JBColor(Color(light), Color(dark)))
    }

    /**
     * Convert a color to hex string.
     */
    private fun hex(color: Color?): String {
        if (color == null) return "transparent"
        return "#${ColorUtil.toHex(color)}"
    }
}
