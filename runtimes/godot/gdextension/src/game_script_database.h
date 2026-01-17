#ifndef GAMESCRIPT_DATABASE_H
#define GAMESCRIPT_DATABASE_H

#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/variant/packed_byte_array.hpp>

#include "generated/snapshot_generated.h"

namespace godot {

class GameScriptManifest;
class LocaleRef;
class ConversationRef;
class NodeRef;
class ActorRef;
class EdgeRef;
class LocalizationRef;

class GameScriptDatabase : public RefCounted {
    GDCLASS(GameScriptDatabase, RefCounted);

    friend class GameScriptManifest;
    friend class ConversationRef;
    friend class NodeRef;
    friend class ActorRef;
    friend class EdgeRef;
    friend class LocalizationRef;
    friend class NodePropertyRef;
    friend class ConversationPropertyRef;

    Ref<GameScriptManifest> _manifest;
    int _current_locale_index;
    PackedByteArray _snapshot_buffer;
    const GameScript::Snapshot* _snapshot;

protected:
    static void _bind_methods();

public:
    GameScriptDatabase();
    ~GameScriptDatabase();

    // Factory method - creates database with loaded snapshot
    static Ref<GameScriptDatabase> create(GameScriptManifest* manifest, int locale_index);

    // Properties
    Ref<LocaleRef> get_current_locale();
    Ref<GameScriptManifest> get_manifest() const;

    // Locale change
    void change_locale(Ref<LocaleRef> locale);

    // Conversation access
    int get_conversation_count() const;
    Ref<ConversationRef> get_conversation(int index);
    Ref<ConversationRef> find_conversation(int id);

    // Node access
    int get_node_count() const;
    Ref<NodeRef> get_node(int index);
    Ref<NodeRef> find_node(int id);
    int get_node_index(int id) const;  // Returns -1 if not found

    // Actor access
    int get_actor_count() const;
    Ref<ActorRef> get_actor(int index);
    Ref<ActorRef> find_actor(int id);

    // Edge access
    int get_edge_count() const;
    Ref<EdgeRef> get_edge(int index);
    Ref<EdgeRef> find_edge(int id);

    // Localization access
    int get_localization_count() const;
    Ref<LocalizationRef> get_localization(int index);
    Ref<LocalizationRef> find_localization(int id);

    // Internal accessor for Ref classes
    const GameScript::Snapshot* get_snapshot() const { return _snapshot; }

private:
    bool load_snapshot(int locale_index);
};

} // namespace godot

#endif // GAMESCRIPT_DATABASE_H
