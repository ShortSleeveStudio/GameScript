package com.shortsleevestudio.gamescript.editor

import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.VirtualFileSystem
import com.intellij.testFramework.LightVirtualFile
import java.io.InputStream
import java.io.OutputStream

/**
 * Virtual file representing the GameScript editor.
 * This allows opening GameScript as an editor tab rather than a tool window.
 */
class GameScriptVirtualFile(
    val project: Project
) : LightVirtualFile("GameScript") {

    override fun isWritable(): Boolean = false

    override fun isDirectory(): Boolean = false

    override fun isValid(): Boolean = true

    override fun getParent(): VirtualFile? = null

    override fun getChildren(): Array<VirtualFile>? = null

    override fun getInputStream(): InputStream = InputStream.nullInputStream()

    override fun getOutputStream(requestor: Any?, newModificationStamp: Long, newTimeStamp: Long): OutputStream {
        throw UnsupportedOperationException("GameScript virtual file is read-only")
    }

    override fun contentsToByteArray(): ByteArray = ByteArray(0)

    override fun getLength(): Long = 0

    override fun refresh(asynchronous: Boolean, recursive: Boolean, postRunnable: Runnable?) {}

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is GameScriptVirtualFile) return false
        return project == other.project
    }

    override fun hashCode(): Int = project.hashCode()
}
