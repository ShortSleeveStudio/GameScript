#ifndef GAMESCRIPT_CONVERSATION_REF_H
#define GAMESCRIPT_CONVERSATION_REF_H

#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/core/class_db.hpp>

namespace GameScript {
struct Conversation;  // Forward declaration for private helper
}

namespace godot {

class GameScriptDatabase;
class NodeRef;
class EdgeRef;
class ConversationPropertyRef;

/// Lightweight wrapper providing read-only access to a Conversation in the snapshot.
///
/// OWNERSHIP MODEL: ConversationRef stores a raw pointer to GameScriptDatabase. The database
/// must outlive all ConversationRef instances. This is safe because:
/// 1. ConversationRef instances are created on-demand by database queries
/// 2. They should be used immediately and not stored long-term
/// 3. The database is typically held by GameScriptRunner for the app lifetime
///
/// If you need to reference a conversation across frames, store the conversation ID (get_id())
/// and re-query from the database when needed.
class ConversationRef : public RefCounted {
    GDCLASS(ConversationRef, RefCounted);

    friend class GameScriptDatabase;

    GameScriptDatabase* _database;  // Non-owning, must outlive this ref
    int _index;

    // Private helper to reduce repeated snapshot access
    const GameScript::Conversation* _get_conversation() const;

protected:
    static void _bind_methods();

public:
    ConversationRef();
    ~ConversationRef();

    void _init(GameScriptDatabase* database, int index);

    // Properties
    int get_index() const;
    int get_id() const;
    String get_name() const;
    String get_notes() const;
    bool get_is_layout_auto() const;
    bool get_is_layout_vertical() const;

    // Node access
    Ref<NodeRef> get_root_node();
    int get_node_count() const;
    Ref<NodeRef> get_node(int index);

    // Edge access
    int get_edge_count() const;
    Ref<EdgeRef> get_edge(int index);

    // Property access
    int get_property_count() const;
    Ref<ConversationPropertyRef> get_property(int index);

    bool is_valid() const;
};

} // namespace godot

#endif // GAMESCRIPT_CONVERSATION_REF_H
