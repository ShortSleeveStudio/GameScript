package com.shortsleevestudio.gamescript.handlers

import com.google.gson.JsonObject
import com.intellij.openapi.diagnostic.Logger

/**
 * Routes incoming messages to their appropriate handlers.
 * Each handler is registered by message type string.
 */
class MessageMediator {

    private val handlers = mutableMapOf<String, suspend (JsonObject) -> Unit>()

    /**
     * Register a handler for a specific message type.
     */
    fun register(type: String, handler: suspend (JsonObject) -> Unit) {
        handlers[type] = handler
    }

    /**
     * Register multiple handlers at once.
     */
    fun registerAll(handlersMap: Map<String, suspend (JsonObject) -> Unit>) {
        handlers.putAll(handlersMap)
    }

    /**
     * Handle an incoming message by routing to the appropriate handler.
     * Re-throws exceptions after logging for caller to handle.
     */
    suspend fun handle(type: String, message: JsonObject) {
        val handler = handlers[type]
        if (handler != null) {
            try {
                handler(message)
            } catch (e: Exception) {
                LOG.error("Handler for '$type' threw exception", e)
                throw e
            }
        } else {
            LOG.warn("No handler registered for message type: $type")
        }
    }

    /**
     * Check if a handler is registered for a message type.
     */
    fun hasHandler(type: String): Boolean = handlers.containsKey(type)

    /**
     * Get all registered message types.
     */
    fun getRegisteredTypes(): Set<String> = handlers.keys.toSet()

    companion object {
        private val LOG = Logger.getInstance(MessageMediator::class.java)
    }
}
