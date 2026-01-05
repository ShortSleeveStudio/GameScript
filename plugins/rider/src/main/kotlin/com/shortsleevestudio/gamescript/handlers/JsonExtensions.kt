package com.shortsleevestudio.gamescript.handlers

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject

/**
 * Safely get a string from a JsonObject, handling JsonNull.
 * Returns null if the key doesn't exist or the value is JsonNull.
 */
fun JsonObject.getStringOrNull(key: String): String? {
    val element = get(key) ?: return null
    return if (element.isJsonNull) null else element.asString
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
