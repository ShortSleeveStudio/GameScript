#ifndef GAMESCRIPT_EDGE_REF_H
#define GAMESCRIPT_EDGE_REF_H

#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/core/class_db.hpp>

namespace GameScript {
struct Edge;  // Forward declaration for private helper
}

namespace godot {

class GameScriptDatabase;
class NodeRef;

// Edge type enum matching FlatBuffers schema
enum class GameScriptEdgeType : int {
    DEFAULT = 0,
    HIDDEN = 1,
};

/// Lightweight wrapper providing read-only access to an Edge in the snapshot.
///
/// OWNERSHIP MODEL: EdgeRef stores a raw pointer to GameScriptDatabase. The database
/// must outlive all EdgeRef instances. This is safe because:
/// 1. EdgeRef instances are created on-demand by database queries
/// 2. They should be used immediately and not stored long-term
/// 3. The database is typically held by GameScriptRunner for the app lifetime
///
/// If you need to reference an edge across frames, store the edge ID (get_id())
/// and re-query from the database when needed.
class EdgeRef : public RefCounted {
    GDCLASS(EdgeRef, RefCounted);

    friend class GameScriptDatabase;

    GameScriptDatabase* _database;  // Non-owning, must outlive this ref
    int _index;

    // Private helper to reduce repeated snapshot access
    const GameScript::Edge* _get_edge() const;

protected:
    static void _bind_methods();

public:
    // Edge type constants (exposed to GDScript)
    static constexpr int EDGE_TYPE_DEFAULT = 0;
    static constexpr int EDGE_TYPE_HIDDEN = 1;

    EdgeRef();
    ~EdgeRef();

    void _init(GameScriptDatabase* database, int index);

    // Properties
    int get_index() const;
    int get_id() const;
    int get_priority() const;
    int get_type() const;

    // Related entities
    Ref<NodeRef> get_source();
    Ref<NodeRef> get_target();

    bool is_valid() const;
};

} // namespace godot

#endif // GAMESCRIPT_EDGE_REF_H
