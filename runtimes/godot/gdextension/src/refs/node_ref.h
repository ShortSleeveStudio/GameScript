#ifndef GAMESCRIPT_NODE_REF_H
#define GAMESCRIPT_NODE_REF_H

#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/core/class_db.hpp>

namespace GameScript {
struct Node;  // Forward declaration for private helper
}

namespace godot {

class GameScriptDatabase;
class ActorRef;
class EdgeRef;
class ConversationRef;
class NodePropertyRef;

// Node type enum matching FlatBuffers schema
enum class GameScriptNodeType : int {
    ROOT = 0,
    DIALOGUE = 1,
    LOGIC = 2,
};

/// Lightweight wrapper providing read-only access to a Node in the snapshot.
///
/// OWNERSHIP MODEL: NodeRef stores a raw pointer to GameScriptDatabase. The database
/// must outlive all NodeRef instances. This is safe because:
/// 1. NodeRef instances are created on-demand by database queries
/// 2. They should be used immediately and not stored long-term
/// 3. The database is typically held by GameScriptRunner for the app lifetime
///
/// If you need to reference a node across frames, store the node ID (get_id())
/// and re-query from the database when needed.
class NodeRef : public RefCounted {
    GDCLASS(NodeRef, RefCounted);

    friend class GameScriptDatabase;

    GameScriptDatabase* _database;  // Non-owning, must outlive this ref
    int _index;

    // Private helper to reduce repeated snapshot access
    const GameScript::Node* _get_node() const;

protected:
    static void _bind_methods();

public:
    // Node type constants (exposed to GDScript)
    static constexpr int NODE_TYPE_ROOT = 0;
    static constexpr int NODE_TYPE_DIALOGUE = 1;
    static constexpr int NODE_TYPE_LOGIC = 2;

    NodeRef();
    ~NodeRef();

    void _init(GameScriptDatabase* database, int index);

    // Properties
    int get_index() const;
    int get_id() const;
    int get_type() const;  // Returns GameScriptNodeType as int
    String get_voice_text() const;
    String get_ui_response_text() const;
    bool get_has_condition() const;
    bool get_has_action() const;
    bool get_is_prevent_response() const;
    float get_position_x() const;
    float get_position_y() const;
    String get_notes() const;

    // Related entities
    Ref<ActorRef> get_actor();
    Ref<ConversationRef> get_conversation();

    // Outgoing edges
    int get_outgoing_edge_count() const;
    Ref<EdgeRef> get_outgoing_edge(int index);

    // Incoming edges
    int get_incoming_edge_count() const;
    Ref<EdgeRef> get_incoming_edge(int index);

    // Properties
    int get_property_count() const;
    Ref<NodePropertyRef> get_property(int index);

    bool is_valid() const;
};

} // namespace godot

#endif // GAMESCRIPT_NODE_REF_H
