package com.shortsleevestudio.gamescript.handlers

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.intellij.openapi.diagnostic.Logger

// Logger for extension functions (used by requireString/requireInt)
private val LOG = Logger.getInstance("com.shortsleevestudio.gamescript.handlers.JsonExtensions")

/**
 * Safely get a string from a JsonObject, handling JsonNull.
 * Returns null if the key doesn't exist or the value is JsonNull.
 */
fun JsonObject.getStringOrNull(key: String): String? {
    val element = get(key) ?: return null
    return if (element.isJsonNull) null else element.asString
}

/**
 * Safely get an int from a JsonObject, handling JsonNull.
 * Returns null if the key doesn't exist or the value is JsonNull.
 */
fun JsonObject.getIntOrNull(key: String): Int? {
    val element = get(key) ?: return null
    return if (element.isJsonNull) null else element.asInt
}

/**
 * Get a required string field, logging a warning if missing.
 * Returns null if the field is missing (caller should return early).
 *
 * @param key The field name
 * @param handlerName The handler name for logging context
 */
fun JsonObject.requireString(key: String, handlerName: String): String? {
    val value = getStringOrNull(key)
    if (value == null) {
        LOG.warn("$handlerName: missing required field '$key'")
    }
    return value
}

/**
 * Get a required int field, logging a warning if missing.
 * Returns null if the field is missing (caller should return early).
 *
 * @param key The field name
 * @param handlerName The handler name for logging context
 */
fun JsonObject.requireInt(key: String, handlerName: String): Int? {
    val value = getIntOrNull(key)
    if (value == null) {
        LOG.warn("$handlerName: missing required field '$key'")
    }
    return value
}

/**
 * Get and validate a method name field.
 * Combines extraction and validation into a single call.
 * Returns null if the field is missing or invalid (caller should return early).
 *
 * @param handlerName The handler name for logging context
 * @param validator The validation function (typically CodeHandlers.validateMethodName)
 */
fun JsonObject.requireValidMethodName(
    handlerName: String,
    validator: (String) -> Unit
): String? {
    val methodName = requireString("methodName", handlerName) ?: return null
    try {
        validator(methodName)
    } catch (e: IllegalArgumentException) {
        LOG.warn("$handlerName: invalid method name '$methodName': ${e.message}")
        return null
    }
    return methodName
}

/**
 * Validate a list of method names.
 * Returns null if any name is invalid (caller should return early).
 *
 * @param methodNames The list of method names to validate
 * @param handlerName The handler name for logging context
 * @param validator The validation function (typically CodeHandlers.validateMethodName)
 */
fun validateMethodNames(
    methodNames: List<String>,
    handlerName: String,
    validator: (String) -> Unit
): Boolean {
    for (name in methodNames) {
        try {
            validator(name)
        } catch (e: IllegalArgumentException) {
            LOG.warn("$handlerName: invalid method name '$name': ${e.message}")
            return false
        }
    }
    return true
}

/**
 * Safely get a string from a JsonElement, handling JsonNull.
 * Returns null if the element is null or JsonNull.
 */
fun JsonElement?.asStringOrNull(): String? {
    if (this == null || this.isJsonNull) return null
    return this.asString
}

/**
 * Convert a JsonArray to a list of parameters for database queries.
 * Handles null, boolean, number, and string types appropriately.
 */
fun JsonArray.toParamList(): List<Any?> {
    return this.map { element ->
        when {
            element.isJsonNull -> null
            element.isJsonPrimitive -> {
                val primitive = element.asJsonPrimitive
                when {
                    primitive.isBoolean -> primitive.asBoolean
                    primitive.isNumber -> primitive.asNumber
                    else -> primitive.asString
                }
            }
            else -> element.toString()
        }
    }
}
