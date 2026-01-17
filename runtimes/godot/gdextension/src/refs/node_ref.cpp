#include "node_ref.h"
#include "actor_ref.h"
#include "edge_ref.h"
#include "conversation_ref.h"
#include "property_ref.h"
#include "../game_script_database.h"

namespace godot {

void NodeRef::_bind_methods() {
    ClassDB::bind_method(D_METHOD("get_index"), &NodeRef::get_index);
    ClassDB::bind_method(D_METHOD("get_id"), &NodeRef::get_id);
    ClassDB::bind_method(D_METHOD("get_type"), &NodeRef::get_type);
    ClassDB::bind_method(D_METHOD("get_voice_text"), &NodeRef::get_voice_text);
    ClassDB::bind_method(D_METHOD("get_ui_response_text"), &NodeRef::get_ui_response_text);
    ClassDB::bind_method(D_METHOD("get_has_condition"), &NodeRef::get_has_condition);
    ClassDB::bind_method(D_METHOD("get_has_action"), &NodeRef::get_has_action);
    ClassDB::bind_method(D_METHOD("get_is_prevent_response"), &NodeRef::get_is_prevent_response);
    ClassDB::bind_method(D_METHOD("get_position_x"), &NodeRef::get_position_x);
    ClassDB::bind_method(D_METHOD("get_position_y"), &NodeRef::get_position_y);
    ClassDB::bind_method(D_METHOD("get_notes"), &NodeRef::get_notes);
    ClassDB::bind_method(D_METHOD("get_actor"), &NodeRef::get_actor);
    ClassDB::bind_method(D_METHOD("get_conversation"), &NodeRef::get_conversation);
    ClassDB::bind_method(D_METHOD("get_outgoing_edge_count"), &NodeRef::get_outgoing_edge_count);
    ClassDB::bind_method(D_METHOD("get_outgoing_edge", "index"), &NodeRef::get_outgoing_edge);
    ClassDB::bind_method(D_METHOD("get_incoming_edge_count"), &NodeRef::get_incoming_edge_count);
    ClassDB::bind_method(D_METHOD("get_incoming_edge", "index"), &NodeRef::get_incoming_edge);
    ClassDB::bind_method(D_METHOD("get_property_count"), &NodeRef::get_property_count);
    ClassDB::bind_method(D_METHOD("get_property", "index"), &NodeRef::get_property);
    ClassDB::bind_method(D_METHOD("is_valid"), &NodeRef::is_valid);

    ADD_PROPERTY(PropertyInfo(Variant::INT, "index"), "", "get_index");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "id"), "", "get_id");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "type"), "", "get_type");
    ADD_PROPERTY(PropertyInfo(Variant::STRING, "voice_text"), "", "get_voice_text");
    ADD_PROPERTY(PropertyInfo(Variant::STRING, "ui_response_text"), "", "get_ui_response_text");
    ADD_PROPERTY(PropertyInfo(Variant::BOOL, "has_condition"), "", "get_has_condition");
    ADD_PROPERTY(PropertyInfo(Variant::BOOL, "has_action"), "", "get_has_action");
    ADD_PROPERTY(PropertyInfo(Variant::BOOL, "is_prevent_response"), "", "get_is_prevent_response");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "outgoing_edge_count"), "", "get_outgoing_edge_count");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "incoming_edge_count"), "", "get_incoming_edge_count");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "property_count"), "", "get_property_count");

    // Node type constants (matches GDScript constants in runner_context.gd)
    ClassDB::bind_integer_constant(get_class_static(), "", "NODE_TYPE_ROOT", NODE_TYPE_ROOT);
    ClassDB::bind_integer_constant(get_class_static(), "", "NODE_TYPE_DIALOGUE", NODE_TYPE_DIALOGUE);
    ClassDB::bind_integer_constant(get_class_static(), "", "NODE_TYPE_LOGIC", NODE_TYPE_LOGIC);
}

NodeRef::NodeRef() : _database(nullptr), _index(-1) {
}

NodeRef::~NodeRef() {
}

void NodeRef::_init(GameScriptDatabase* database, int index) {
    _database = database;
    _index = index;
}

int NodeRef::get_index() const {
    return _index;
}

const GameScript::Node* NodeRef::_get_node() const {
    if (!is_valid()) return nullptr;
    return _database->get_snapshot()->nodes()->Get(_index);
}

int NodeRef::get_id() const {
    const auto* node = _get_node();
    return node ? node->id() : -1;
}

int NodeRef::get_type() const {
    const auto* node = _get_node();
    return node ? static_cast<int>(node->type()) : 0;
}

String NodeRef::get_voice_text() const {
    const auto* node = _get_node();
    if (!node || !node->voice_text()) return String();
    return String::utf8(node->voice_text()->c_str());
}

String NodeRef::get_ui_response_text() const {
    const auto* node = _get_node();
    if (!node || !node->ui_response_text()) return String();
    return String::utf8(node->ui_response_text()->c_str());
}

bool NodeRef::get_has_condition() const {
    const auto* node = _get_node();
    return node ? node->has_condition() : false;
}

bool NodeRef::get_has_action() const {
    const auto* node = _get_node();
    return node ? node->has_action() : false;
}

bool NodeRef::get_is_prevent_response() const {
    const auto* node = _get_node();
    return node ? node->is_prevent_response() : false;
}

float NodeRef::get_position_x() const {
    const auto* node = _get_node();
    return node ? node->position_x() : 0.0f;
}

float NodeRef::get_position_y() const {
    const auto* node = _get_node();
    return node ? node->position_y() : 0.0f;
}

String NodeRef::get_notes() const {
    const auto* node = _get_node();
    if (!node || !node->notes()) return String();
    return String::utf8(node->notes()->c_str());
}

Ref<ActorRef> NodeRef::get_actor() {
    const auto* node = _get_node();
    if (!node) return Ref<ActorRef>();

    int actor_idx = node->actor_idx();
    if (actor_idx < 0) return Ref<ActorRef>();

    return _database->get_actor(actor_idx);
}

Ref<ConversationRef> NodeRef::get_conversation() {
    const auto* node = _get_node();
    if (!node) return Ref<ConversationRef>();

    int conv_idx = node->conversation_idx();
    if (conv_idx < 0) return Ref<ConversationRef>();

    return _database->get_conversation(conv_idx);
}

int NodeRef::get_outgoing_edge_count() const {
    const auto* node = _get_node();
    if (!node || !node->outgoing_edge_indices()) return 0;
    return node->outgoing_edge_indices()->size();
}

Ref<EdgeRef> NodeRef::get_outgoing_edge(int index) {
    const auto* node = _get_node();
    if (!node || !node->outgoing_edge_indices() ||
        index < 0 || index >= static_cast<int>(node->outgoing_edge_indices()->size())) {
        return Ref<EdgeRef>();
    }

    int edge_idx = node->outgoing_edge_indices()->Get(index);
    return _database->get_edge(edge_idx);
}

int NodeRef::get_incoming_edge_count() const {
    const auto* node = _get_node();
    if (!node || !node->incoming_edge_indices()) return 0;
    return node->incoming_edge_indices()->size();
}

Ref<EdgeRef> NodeRef::get_incoming_edge(int index) {
    const auto* node = _get_node();
    if (!node || !node->incoming_edge_indices() ||
        index < 0 || index >= static_cast<int>(node->incoming_edge_indices()->size())) {
        return Ref<EdgeRef>();
    }

    int edge_idx = node->incoming_edge_indices()->Get(index);
    return _database->get_edge(edge_idx);
}

int NodeRef::get_property_count() const {
    const auto* node = _get_node();
    if (!node || !node->properties()) return 0;
    return node->properties()->size();
}

Ref<NodePropertyRef> NodeRef::get_property(int index) {
    const auto* node = _get_node();
    if (!node || !node->properties() ||
        index < 0 || index >= static_cast<int>(node->properties()->size())) {
        return Ref<NodePropertyRef>();
    }

    Ref<NodePropertyRef> ref;
    ref.instantiate();
    ref->_init(_database, _index, index);
    return ref;
}

bool NodeRef::is_valid() const {
    return _database != nullptr && _index >= 0 && _database->get_snapshot() != nullptr;
}

} // namespace godot
