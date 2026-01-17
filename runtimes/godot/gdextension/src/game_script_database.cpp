#include "game_script_database.h"
#include "game_script_manifest.h"
#include "refs/locale_ref.h"
#include "refs/conversation_ref.h"
#include "refs/node_ref.h"
#include "refs/actor_ref.h"
#include "refs/edge_ref.h"
#include "refs/localization_ref.h"

#include <godot_cpp/classes/file_access.hpp>
#include <godot_cpp/variant/utility_functions.hpp>

namespace godot {

void GameScriptDatabase::_bind_methods() {
    ClassDB::bind_method(D_METHOD("get_current_locale"), &GameScriptDatabase::get_current_locale);
    ClassDB::bind_method(D_METHOD("get_manifest"), &GameScriptDatabase::get_manifest);
    ClassDB::bind_method(D_METHOD("change_locale", "locale"), &GameScriptDatabase::change_locale);

    ClassDB::bind_method(D_METHOD("get_conversation_count"), &GameScriptDatabase::get_conversation_count);
    ClassDB::bind_method(D_METHOD("get_conversation", "index"), &GameScriptDatabase::get_conversation);
    ClassDB::bind_method(D_METHOD("find_conversation", "id"), &GameScriptDatabase::find_conversation);

    ClassDB::bind_method(D_METHOD("get_node_count"), &GameScriptDatabase::get_node_count);
    ClassDB::bind_method(D_METHOD("get_node", "index"), &GameScriptDatabase::get_node);
    ClassDB::bind_method(D_METHOD("find_node", "id"), &GameScriptDatabase::find_node);
    ClassDB::bind_method(D_METHOD("get_node_index", "id"), &GameScriptDatabase::get_node_index);

    ClassDB::bind_method(D_METHOD("get_actor_count"), &GameScriptDatabase::get_actor_count);
    ClassDB::bind_method(D_METHOD("get_actor", "index"), &GameScriptDatabase::get_actor);
    ClassDB::bind_method(D_METHOD("find_actor", "id"), &GameScriptDatabase::find_actor);

    ClassDB::bind_method(D_METHOD("get_edge_count"), &GameScriptDatabase::get_edge_count);
    ClassDB::bind_method(D_METHOD("get_edge", "index"), &GameScriptDatabase::get_edge);
    ClassDB::bind_method(D_METHOD("find_edge", "id"), &GameScriptDatabase::find_edge);

    ClassDB::bind_method(D_METHOD("get_localization_count"), &GameScriptDatabase::get_localization_count);
    ClassDB::bind_method(D_METHOD("get_localization", "index"), &GameScriptDatabase::get_localization);
    ClassDB::bind_method(D_METHOD("find_localization", "id"), &GameScriptDatabase::find_localization);

    ADD_PROPERTY(PropertyInfo(Variant::INT, "conversation_count"), "", "get_conversation_count");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "node_count"), "", "get_node_count");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "actor_count"), "", "get_actor_count");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "edge_count"), "", "get_edge_count");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "localization_count"), "", "get_localization_count");

    ADD_SIGNAL(MethodInfo("locale_changed"));
}

GameScriptDatabase::GameScriptDatabase()
    : _current_locale_index(-1), _snapshot(nullptr) {
}

GameScriptDatabase::~GameScriptDatabase() {
    _snapshot = nullptr;
}

Ref<GameScriptDatabase> GameScriptDatabase::create(GameScriptManifest* manifest, int locale_index) {
    Ref<GameScriptDatabase> database;
    database.instantiate();
    database->_manifest = Ref<GameScriptManifest>(manifest);

    if (!database->load_snapshot(locale_index)) {
        return Ref<GameScriptDatabase>();
    }

    return database;
}

bool GameScriptDatabase::load_snapshot(int locale_index) {
    if (!_manifest.is_valid()) {
        UtilityFunctions::push_error("GameScriptDatabase: No manifest available");
        return false;
    }

    String snapshot_path = _manifest->get_snapshot_path(locale_index);
    if (snapshot_path.is_empty()) {
        UtilityFunctions::push_error("GameScriptDatabase: Invalid locale index ", locale_index);
        return false;
    }

    Ref<FileAccess> file = FileAccess::open(snapshot_path, FileAccess::READ);
    if (!file.is_valid()) {
        UtilityFunctions::push_error("GameScriptDatabase: Failed to open snapshot file: ", snapshot_path);
        return false;
    }

    int64_t file_length = file->get_length();
    _snapshot_buffer.resize(file_length);
    file->get_buffer(_snapshot_buffer.ptrw(), file_length);
    file->close();

    // Verify FlatBuffers data
    flatbuffers::Verifier verifier(_snapshot_buffer.ptr(), _snapshot_buffer.size());
    if (!GameScript::VerifySnapshotBuffer(verifier)) {
        UtilityFunctions::push_error("GameScriptDatabase: Invalid snapshot data in file: ", snapshot_path);
        _snapshot_buffer.clear();
        return false;
    }

    _snapshot = GameScript::GetSnapshot(_snapshot_buffer.ptr());
    _current_locale_index = locale_index;

    return true;
}

Ref<LocaleRef> GameScriptDatabase::get_current_locale() {
    if (!_manifest.is_valid() || _current_locale_index < 0) {
        return Ref<LocaleRef>();
    }
    return _manifest->get_locale(_current_locale_index);
}

Ref<GameScriptManifest> GameScriptDatabase::get_manifest() const {
    return _manifest;
}

void GameScriptDatabase::change_locale(Ref<LocaleRef> locale) {
    if (!locale.is_valid() || !locale->is_valid()) {
        UtilityFunctions::push_error("GameScriptDatabase: Invalid locale provided to change_locale");
        return;
    }

    if (load_snapshot(locale->get_index())) {
        emit_signal("locale_changed");
    }
}

// Conversation access
int GameScriptDatabase::get_conversation_count() const {
    if (!_snapshot || !_snapshot->conversations()) return 0;
    return _snapshot->conversations()->size();
}

Ref<ConversationRef> GameScriptDatabase::get_conversation(int index) {
    if (!_snapshot || !_snapshot->conversations() ||
        index < 0 || index >= static_cast<int>(_snapshot->conversations()->size())) {
        return Ref<ConversationRef>();
    }

    Ref<ConversationRef> ref;
    ref.instantiate();
    ref->_init(this, index);
    return ref;
}

Ref<ConversationRef> GameScriptDatabase::find_conversation(int id) {
    if (!_snapshot || !_snapshot->conversations()) {
        UtilityFunctions::push_error("GameScriptDatabase: No snapshot loaded");
        return Ref<ConversationRef>();
    }

    int count = _snapshot->conversations()->size();
    for (int i = 0; i < count; i++) {
        const GameScript::Conversation* conv = _snapshot->conversations()->Get(i);
        if (conv && conv->id() == id) {
            return get_conversation(i);
        }
    }

    UtilityFunctions::push_error("GameScriptDatabase: Conversation with ID ", id, " not found");
    return Ref<ConversationRef>();
}

// Node access
int GameScriptDatabase::get_node_count() const {
    if (!_snapshot || !_snapshot->nodes()) return 0;
    return _snapshot->nodes()->size();
}

Ref<NodeRef> GameScriptDatabase::get_node(int index) {
    if (!_snapshot || !_snapshot->nodes() ||
        index < 0 || index >= static_cast<int>(_snapshot->nodes()->size())) {
        return Ref<NodeRef>();
    }

    Ref<NodeRef> ref;
    ref.instantiate();
    ref->_init(this, index);
    return ref;
}

Ref<NodeRef> GameScriptDatabase::find_node(int id) {
    int index = get_node_index(id);
    if (index >= 0) {
        return get_node(index);
    }
    UtilityFunctions::push_error("GameScriptDatabase: Node with ID ", id, " not found");
    return Ref<NodeRef>();
}

int GameScriptDatabase::get_node_index(int id) const {
    if (!_snapshot || !_snapshot->nodes()) {
        return -1;
    }

    int count = _snapshot->nodes()->size();
    for (int i = 0; i < count; i++) {
        const GameScript::Node* node = _snapshot->nodes()->Get(i);
        if (node && node->id() == id) {
            return i;
        }
    }

    return -1;
}

// Actor access
int GameScriptDatabase::get_actor_count() const {
    if (!_snapshot || !_snapshot->actors()) return 0;
    return _snapshot->actors()->size();
}

Ref<ActorRef> GameScriptDatabase::get_actor(int index) {
    if (!_snapshot || !_snapshot->actors() ||
        index < 0 || index >= static_cast<int>(_snapshot->actors()->size())) {
        return Ref<ActorRef>();
    }

    Ref<ActorRef> ref;
    ref.instantiate();
    ref->_init(this, index);
    return ref;
}

Ref<ActorRef> GameScriptDatabase::find_actor(int id) {
    if (!_snapshot || !_snapshot->actors()) {
        UtilityFunctions::push_error("GameScriptDatabase: No snapshot loaded");
        return Ref<ActorRef>();
    }

    int count = _snapshot->actors()->size();
    for (int i = 0; i < count; i++) {
        const GameScript::Actor* actor = _snapshot->actors()->Get(i);
        if (actor && actor->id() == id) {
            return get_actor(i);
        }
    }

    UtilityFunctions::push_error("GameScriptDatabase: Actor with ID ", id, " not found");
    return Ref<ActorRef>();
}

// Edge access
int GameScriptDatabase::get_edge_count() const {
    if (!_snapshot || !_snapshot->edges()) return 0;
    return _snapshot->edges()->size();
}

Ref<EdgeRef> GameScriptDatabase::get_edge(int index) {
    if (!_snapshot || !_snapshot->edges() ||
        index < 0 || index >= static_cast<int>(_snapshot->edges()->size())) {
        return Ref<EdgeRef>();
    }

    Ref<EdgeRef> ref;
    ref.instantiate();
    ref->_init(this, index);
    return ref;
}

Ref<EdgeRef> GameScriptDatabase::find_edge(int id) {
    if (!_snapshot || !_snapshot->edges()) {
        UtilityFunctions::push_error("GameScriptDatabase: No snapshot loaded");
        return Ref<EdgeRef>();
    }

    int count = _snapshot->edges()->size();
    for (int i = 0; i < count; i++) {
        const GameScript::Edge* edge = _snapshot->edges()->Get(i);
        if (edge && edge->id() == id) {
            return get_edge(i);
        }
    }

    UtilityFunctions::push_error("GameScriptDatabase: Edge with ID ", id, " not found");
    return Ref<EdgeRef>();
}

// Localization access
int GameScriptDatabase::get_localization_count() const {
    if (!_snapshot || !_snapshot->localizations()) return 0;
    return _snapshot->localizations()->size();
}

Ref<LocalizationRef> GameScriptDatabase::get_localization(int index) {
    if (!_snapshot || !_snapshot->localizations() ||
        index < 0 || index >= static_cast<int>(_snapshot->localizations()->size())) {
        return Ref<LocalizationRef>();
    }

    Ref<LocalizationRef> ref;
    ref.instantiate();
    ref->_init(this, index);
    return ref;
}

Ref<LocalizationRef> GameScriptDatabase::find_localization(int id) {
    if (!_snapshot || !_snapshot->localizations()) {
        UtilityFunctions::push_error("GameScriptDatabase: No snapshot loaded");
        return Ref<LocalizationRef>();
    }

    int count = _snapshot->localizations()->size();
    for (int i = 0; i < count; i++) {
        const GameScript::Localization* loc = _snapshot->localizations()->Get(i);
        if (loc && loc->id() == id) {
            return get_localization(i);
        }
    }

    UtilityFunctions::push_error("GameScriptDatabase: Localization with ID ", id, " not found");
    return Ref<LocalizationRef>();
}

} // namespace godot
