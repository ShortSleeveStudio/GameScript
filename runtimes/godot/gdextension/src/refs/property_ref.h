#ifndef GAMESCRIPT_PROPERTY_REF_H
#define GAMESCRIPT_PROPERTY_REF_H

#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/core/class_db.hpp>

namespace GameScript {
struct NodeProperty;
struct ConversationProperty;
struct PropertyTemplate;
}

namespace godot {

class GameScriptDatabase;

// Property type enum matching FlatBuffers schema
enum class GameScriptPropertyType : int {
    STRING = 0,
    INTEGER = 1,
    DECIMAL = 2,
    BOOLEAN = 3,
};

/// Lightweight wrapper providing read-only access to a Node's custom property.
///
/// OWNERSHIP MODEL: NodePropertyRef stores a raw pointer to GameScriptDatabase. The database
/// must outlive all NodePropertyRef instances. This is safe because:
/// 1. NodePropertyRef instances are created on-demand by NodeRef queries
/// 2. They should be used immediately and not stored long-term
/// 3. The database is typically held by GameScriptRunner for the app lifetime
class NodePropertyRef : public RefCounted {
    GDCLASS(NodePropertyRef, RefCounted);

    friend class NodeRef;

    GameScriptDatabase* _database;  // Non-owning, must outlive this ref
    int _node_index;
    int _property_index;

    // Private helpers to reduce repeated snapshot access
    const GameScript::NodeProperty* _get_property() const;
    const GameScript::PropertyTemplate* _get_template() const;

protected:
    static void _bind_methods();

public:
    // Property type constants (exposed to GDScript)
    static constexpr int PROPERTY_TYPE_STRING = 0;
    static constexpr int PROPERTY_TYPE_INTEGER = 1;
    static constexpr int PROPERTY_TYPE_DECIMAL = 2;
    static constexpr int PROPERTY_TYPE_BOOLEAN = 3;

    NodePropertyRef();
    ~NodePropertyRef();

    void _init(GameScriptDatabase* database, int node_index, int property_index);

    // Properties
    String get_name() const;
    int get_type() const;

    // Value accessors
    String get_string_value() const;
    int get_int_value() const;
    float get_float_value() const;
    bool get_bool_value() const;

    // Try-get methods
    bool try_get_string(String& out_value) const;
    bool try_get_int(int& out_value) const;
    bool try_get_float(float& out_value) const;
    bool try_get_bool(bool& out_value) const;

    bool is_valid() const;
};

/// Lightweight wrapper providing read-only access to a Conversation's custom property.
///
/// OWNERSHIP MODEL: ConversationPropertyRef stores a raw pointer to GameScriptDatabase. The database
/// must outlive all ConversationPropertyRef instances. This is safe because:
/// 1. ConversationPropertyRef instances are created on-demand by ConversationRef queries
/// 2. They should be used immediately and not stored long-term
/// 3. The database is typically held by GameScriptRunner for the app lifetime
class ConversationPropertyRef : public RefCounted {
    GDCLASS(ConversationPropertyRef, RefCounted);

    friend class ConversationRef;

    GameScriptDatabase* _database;  // Non-owning, must outlive this ref
    int _conversation_index;
    int _property_index;

    // Private helpers to reduce repeated snapshot access
    const GameScript::ConversationProperty* _get_property() const;
    const GameScript::PropertyTemplate* _get_template() const;

protected:
    static void _bind_methods();

public:
    // Property type constants (exposed to GDScript)
    static constexpr int PROPERTY_TYPE_STRING = 0;
    static constexpr int PROPERTY_TYPE_INTEGER = 1;
    static constexpr int PROPERTY_TYPE_DECIMAL = 2;
    static constexpr int PROPERTY_TYPE_BOOLEAN = 3;

    ConversationPropertyRef();
    ~ConversationPropertyRef();

    void _init(GameScriptDatabase* database, int conversation_index, int property_index);

    // Properties
    String get_name() const;
    int get_type() const;

    // Value accessors
    String get_string_value() const;
    int get_int_value() const;
    float get_float_value() const;
    bool get_bool_value() const;

    // Try-get methods
    bool try_get_string(String& out_value) const;
    bool try_get_int(int& out_value) const;
    bool try_get_float(float& out_value) const;
    bool try_get_bool(bool& out_value) const;

    bool is_valid() const;
};

} // namespace godot

#endif // GAMESCRIPT_PROPERTY_REF_H
