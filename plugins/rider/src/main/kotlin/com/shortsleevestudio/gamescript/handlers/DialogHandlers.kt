package com.shortsleevestudio.gamescript.handlers

import com.google.gson.JsonObject
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.fileChooser.FileChooser
import com.intellij.openapi.fileChooser.FileChooserDescriptorFactory
import com.intellij.openapi.fileChooser.FileSaverDescriptor
import com.intellij.openapi.fileChooser.FileChooserFactory
import com.intellij.openapi.ui.Messages

/**
 * Handlers for native dialog operations.
 * Implements: dialog:openSqlite, dialog:saveSqlite, dialog:openCsv,
 * dialog:saveCsv, dialog:selectFolder
 */
class DialogHandlers(private val context: HandlerContext) {

    /**
     * Get all handlers as a map.
     */
    fun getHandlers(): Map<String, suspend (JsonObject) -> Unit> = mapOf(
        "dialog:openSqlite" to ::handleOpenSqlite,
        "dialog:saveSqlite" to ::handleSaveSqlite,
        "dialog:openCsv" to ::handleOpenCsv,
        "dialog:saveCsv" to ::handleSaveCsv,
        "dialog:selectFolder" to ::handleSelectFolder
    )

    private suspend fun handleOpenSqlite(message: JsonObject) {
        val id = message.get("id")?.asString ?: return

        ApplicationManager.getApplication().invokeLater {
            try {
                val descriptor = FileChooserDescriptorFactory.createSingleFileDescriptor()
                    .withFileFilter { vf ->
                        vf.extension?.lowercase() in listOf("db", "sqlite", "sqlite3")
                    }
                    .withTitle("Open SQLite Database")
                    .withDescription("Select a SQLite database file")

                val chosen = FileChooser.chooseFile(descriptor, context.project, null)

                if (chosen != null) {
                    context.postResponse(
                        id, "dialog:result", true,
                        mapOf("cancelled" to false, "filePath" to chosen.path)
                    )
                } else {
                    context.postResponse(
                        id, "dialog:result", true,
                        mapOf("cancelled" to true)
                    )
                }
            } catch (e: Exception) {
                LOG.error("Error showing file chooser", e)
                context.postResponse(id, "dialog:result", false, error = e.message)
            }
        }
    }

    private suspend fun handleSaveSqlite(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val defaultName = message.get("defaultName")?.asString ?: "database.db"

        ApplicationManager.getApplication().invokeLater {
            try {
                val descriptor = FileSaverDescriptor(
                    "Save SQLite Database",
                    "Choose where to save the database",
                    "db", "sqlite", "sqlite3"
                )

                val dialog = FileChooserFactory.getInstance().createSaveFileDialog(descriptor, context.project)
                val baseDir = context.getWorkspaceFolder()
                val result = dialog.save(baseDir, defaultName)

                if (result != null) {
                    context.postResponse(
                        id, "dialog:result", true,
                        mapOf("cancelled" to false, "filePath" to result.file.path)
                    )
                } else {
                    context.postResponse(
                        id, "dialog:result", true,
                        mapOf("cancelled" to true)
                    )
                }
            } catch (e: Exception) {
                LOG.error("Error showing save dialog", e)
                context.postResponse(id, "dialog:result", false, error = e.message)
            }
        }
    }

    private suspend fun handleOpenCsv(message: JsonObject) {
        val id = message.get("id")?.asString ?: return

        ApplicationManager.getApplication().invokeLater {
            try {
                val descriptor = FileChooserDescriptorFactory.createSingleFileDescriptor()
                    .withFileFilter { vf ->
                        vf.extension?.lowercase() == "csv"
                    }
                    .withTitle("Open CSV File")
                    .withDescription("Select a CSV file to import")

                val chosen = FileChooser.chooseFile(descriptor, context.project, null)

                if (chosen != null) {
                    context.postResponse(
                        id, "dialog:result", true,
                        mapOf("cancelled" to false, "filePath" to chosen.path)
                    )
                } else {
                    context.postResponse(
                        id, "dialog:result", true,
                        mapOf("cancelled" to true)
                    )
                }
            } catch (e: Exception) {
                LOG.error("Error showing CSV file chooser", e)
                context.postResponse(id, "dialog:result", false, error = e.message)
            }
        }
    }

    private suspend fun handleSaveCsv(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val defaultName = message.get("defaultName")?.asString ?: "export.csv"

        ApplicationManager.getApplication().invokeLater {
            try {
                val descriptor = FileSaverDescriptor(
                    "Save CSV File",
                    "Choose where to save the CSV file",
                    "csv"
                )

                val dialog = FileChooserFactory.getInstance().createSaveFileDialog(descriptor, context.project)
                val baseDir = context.getWorkspaceFolder()
                val result = dialog.save(baseDir, defaultName)

                if (result != null) {
                    context.postResponse(
                        id, "dialog:result", true,
                        mapOf("cancelled" to false, "filePath" to result.file.path)
                    )
                } else {
                    context.postResponse(
                        id, "dialog:result", true,
                        mapOf("cancelled" to true)
                    )
                }
            } catch (e: Exception) {
                LOG.error("Error showing CSV save dialog", e)
                context.postResponse(id, "dialog:result", false, error = e.message)
            }
        }
    }

    private suspend fun handleSelectFolder(message: JsonObject) {
        val id = message.get("id")?.asString ?: return
        val title = message.get("title")?.asString ?: "Select Folder"

        ApplicationManager.getApplication().invokeLater {
            try {
                val descriptor = FileChooserDescriptorFactory.createSingleFolderDescriptor()
                    .withTitle(title)
                    .withDescription("Select a folder")

                val chosen = FileChooser.chooseFile(descriptor, context.project, context.getWorkspaceFolder())

                if (chosen != null) {
                    // Convert to relative path if within workspace
                    val workspacePath = context.getWorkspacePath()
                    val chosenPath = chosen.path

                    val relativePath = if (workspacePath != null && chosenPath.startsWith(workspacePath)) {
                        chosenPath.removePrefix(workspacePath).removePrefix("/").ifEmpty { "." }
                    } else {
                        null
                    }

                    if (relativePath != null) {
                        context.postResponse(
                            id, "dialog:result", true,
                            mapOf("cancelled" to false, "filePath" to relativePath)
                        )
                    } else {
                        // Folder outside workspace - show error
                        Messages.showErrorDialog(
                            context.project,
                            "Selected folder must be within the workspace.",
                            "Invalid Selection"
                        )
                        context.postResponse(
                            id, "dialog:result", true,
                            mapOf("cancelled" to true)
                        )
                    }
                } else {
                    context.postResponse(
                        id, "dialog:result", true,
                        mapOf("cancelled" to true)
                    )
                }
            } catch (e: Exception) {
                LOG.error("Error showing folder chooser", e)
                context.postResponse(id, "dialog:result", false, error = e.message)
            }
        }
    }

    companion object {
        private val LOG = Logger.getInstance(DialogHandlers::class.java)
    }
}
