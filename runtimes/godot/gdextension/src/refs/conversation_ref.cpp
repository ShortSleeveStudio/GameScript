#include "conversation_ref.h"
#include "node_ref.h"
#include "edge_ref.h"
#include "property_ref.h"
#include "../game_script_database.h"

namespace godot {

void ConversationRef::_bind_methods() {
    ClassDB::bind_method(D_METHOD("get_index"), &ConversationRef::get_index);
    ClassDB::bind_method(D_METHOD("get_id"), &ConversationRef::get_id);
    ClassDB::bind_method(D_METHOD("get_name"), &ConversationRef::get_name);
    ClassDB::bind_method(D_METHOD("get_notes"), &ConversationRef::get_notes);
    ClassDB::bind_method(D_METHOD("get_is_layout_auto"), &ConversationRef::get_is_layout_auto);
    ClassDB::bind_method(D_METHOD("get_is_layout_vertical"), &ConversationRef::get_is_layout_vertical);
    ClassDB::bind_method(D_METHOD("get_root_node"), &ConversationRef::get_root_node);
    ClassDB::bind_method(D_METHOD("get_node_count"), &ConversationRef::get_node_count);
    ClassDB::bind_method(D_METHOD("get_node", "index"), &ConversationRef::get_node);
    ClassDB::bind_method(D_METHOD("get_edge_count"), &ConversationRef::get_edge_count);
    ClassDB::bind_method(D_METHOD("get_edge", "index"), &ConversationRef::get_edge);
    ClassDB::bind_method(D_METHOD("get_property_count"), &ConversationRef::get_property_count);
    ClassDB::bind_method(D_METHOD("get_property", "index"), &ConversationRef::get_property);
    ClassDB::bind_method(D_METHOD("is_valid"), &ConversationRef::is_valid);

    ADD_PROPERTY(PropertyInfo(Variant::INT, "index"), "", "get_index");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "id"), "", "get_id");
    ADD_PROPERTY(PropertyInfo(Variant::STRING, "name"), "", "get_name");
    ADD_PROPERTY(PropertyInfo(Variant::STRING, "notes"), "", "get_notes");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "node_count"), "", "get_node_count");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "edge_count"), "", "get_edge_count");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "property_count"), "", "get_property_count");
}

ConversationRef::ConversationRef() : _database(nullptr), _index(-1) {
}

ConversationRef::~ConversationRef() {
}

void ConversationRef::_init(GameScriptDatabase* database, int index) {
    _database = database;
    _index = index;
}

int ConversationRef::get_index() const {
    return _index;
}

const GameScript::Conversation* ConversationRef::_get_conversation() const {
    if (!is_valid()) return nullptr;
    return _database->get_snapshot()->conversations()->Get(_index);
}

int ConversationRef::get_id() const {
    const auto* conv = _get_conversation();
    return conv ? conv->id() : -1;
}

String ConversationRef::get_name() const {
    const auto* conv = _get_conversation();
    if (!conv || !conv->name()) return String();
    return String::utf8(conv->name()->c_str());
}

String ConversationRef::get_notes() const {
    const auto* conv = _get_conversation();
    if (!conv || !conv->notes()) return String();
    return String::utf8(conv->notes()->c_str());
}

bool ConversationRef::get_is_layout_auto() const {
    const auto* conv = _get_conversation();
    return conv ? conv->is_layout_auto() : false;
}

bool ConversationRef::get_is_layout_vertical() const {
    const auto* conv = _get_conversation();
    return conv ? conv->is_layout_vertical() : false;
}

Ref<NodeRef> ConversationRef::get_root_node() {
    const auto* conv = _get_conversation();
    if (!conv) return Ref<NodeRef>();

    int root_idx = conv->root_node_idx();
    if (root_idx < 0) return Ref<NodeRef>();

    return _database->get_node(root_idx);
}

int ConversationRef::get_node_count() const {
    const auto* conv = _get_conversation();
    if (!conv || !conv->node_indices()) return 0;
    return conv->node_indices()->size();
}

Ref<NodeRef> ConversationRef::get_node(int index) {
    const auto* conv = _get_conversation();
    if (!conv || !conv->node_indices() ||
        index < 0 || index >= static_cast<int>(conv->node_indices()->size())) {
        return Ref<NodeRef>();
    }

    int node_idx = conv->node_indices()->Get(index);
    return _database->get_node(node_idx);
}

int ConversationRef::get_edge_count() const {
    const auto* conv = _get_conversation();
    if (!conv || !conv->edge_indices()) return 0;
    return conv->edge_indices()->size();
}

Ref<EdgeRef> ConversationRef::get_edge(int index) {
    const auto* conv = _get_conversation();
    if (!conv || !conv->edge_indices() ||
        index < 0 || index >= static_cast<int>(conv->edge_indices()->size())) {
        return Ref<EdgeRef>();
    }

    int edge_idx = conv->edge_indices()->Get(index);
    return _database->get_edge(edge_idx);
}

int ConversationRef::get_property_count() const {
    const auto* conv = _get_conversation();
    if (!conv || !conv->properties()) return 0;
    return conv->properties()->size();
}

Ref<ConversationPropertyRef> ConversationRef::get_property(int index) {
    const auto* conv = _get_conversation();
    if (!conv || !conv->properties() ||
        index < 0 || index >= static_cast<int>(conv->properties()->size())) {
        return Ref<ConversationPropertyRef>();
    }

    Ref<ConversationPropertyRef> ref;
    ref.instantiate();
    ref->_init(_database, _index, index);
    return ref;
}

bool ConversationRef::is_valid() const {
    return _database != nullptr && _index >= 0 && _database->get_snapshot() != nullptr;
}

} // namespace godot
