#ifndef GAMESCRIPT_ACTOR_REF_H
#define GAMESCRIPT_ACTOR_REF_H

#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/core/class_db.hpp>

namespace GameScript {
struct Actor;  // Forward declaration for private helper
}

namespace godot {

class GameScriptDatabase;

/// Lightweight wrapper providing read-only access to an Actor in the snapshot.
///
/// OWNERSHIP MODEL: ActorRef stores a raw pointer to GameScriptDatabase. The database
/// must outlive all ActorRef instances. This is safe because:
/// 1. ActorRef instances are created on-demand by database queries
/// 2. They should be used immediately and not stored long-term
/// 3. The database is typically held by GameScriptRunner for the app lifetime
///
/// If you need to reference an actor across frames, store the actor ID (get_id())
/// and re-query from the database when needed.
class ActorRef : public RefCounted {
    GDCLASS(ActorRef, RefCounted);

    friend class GameScriptDatabase;

    GameScriptDatabase* _database;  // Non-owning, must outlive this ref
    int _index;

    // Private helper to reduce repeated snapshot access
    const GameScript::Actor* _get_actor() const;

protected:
    static void _bind_methods();

public:
    ActorRef();
    ~ActorRef();

    void _init(GameScriptDatabase* database, int index);

    // Properties
    int get_index() const;
    int get_id() const;
    String get_name() const;
    String get_localized_name() const;
    String get_color() const;

    bool is_valid() const;
};

} // namespace godot

#endif // GAMESCRIPT_ACTOR_REF_H
