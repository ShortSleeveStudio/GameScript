#include "edge_ref.h"
#include "node_ref.h"
#include "../game_script_database.h"

namespace godot {

void EdgeRef::_bind_methods() {
    ClassDB::bind_method(D_METHOD("get_index"), &EdgeRef::get_index);
    ClassDB::bind_method(D_METHOD("get_id"), &EdgeRef::get_id);
    ClassDB::bind_method(D_METHOD("get_priority"), &EdgeRef::get_priority);
    ClassDB::bind_method(D_METHOD("get_type"), &EdgeRef::get_type);
    ClassDB::bind_method(D_METHOD("get_source"), &EdgeRef::get_source);
    ClassDB::bind_method(D_METHOD("get_target"), &EdgeRef::get_target);
    ClassDB::bind_method(D_METHOD("is_valid"), &EdgeRef::is_valid);

    ADD_PROPERTY(PropertyInfo(Variant::INT, "index"), "", "get_index");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "id"), "", "get_id");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "priority"), "", "get_priority");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "type"), "", "get_type");

    // Edge type constants
    ClassDB::bind_integer_constant(get_class_static(), "", "EDGE_TYPE_DEFAULT", EDGE_TYPE_DEFAULT);
    ClassDB::bind_integer_constant(get_class_static(), "", "EDGE_TYPE_HIDDEN", EDGE_TYPE_HIDDEN);
}

EdgeRef::EdgeRef() : _database(nullptr), _index(-1) {
}

EdgeRef::~EdgeRef() {
}

void EdgeRef::_init(GameScriptDatabase* database, int index) {
    _database = database;
    _index = index;
}

int EdgeRef::get_index() const {
    return _index;
}

const GameScript::Edge* EdgeRef::_get_edge() const {
    if (!is_valid()) return nullptr;
    return _database->get_snapshot()->edges()->Get(_index);
}

int EdgeRef::get_id() const {
    const auto* edge = _get_edge();
    return edge ? edge->id() : -1;
}

int EdgeRef::get_priority() const {
    const auto* edge = _get_edge();
    return edge ? edge->priority() : 0;
}

int EdgeRef::get_type() const {
    const auto* edge = _get_edge();
    return edge ? static_cast<int>(edge->type()) : 0;
}

Ref<NodeRef> EdgeRef::get_source() {
    const auto* edge = _get_edge();
    if (!edge) return Ref<NodeRef>();

    int source_idx = edge->source_idx();
    if (source_idx < 0) return Ref<NodeRef>();

    return _database->get_node(source_idx);
}

Ref<NodeRef> EdgeRef::get_target() {
    const auto* edge = _get_edge();
    if (!edge) return Ref<NodeRef>();

    int target_idx = edge->target_idx();
    if (target_idx < 0) return Ref<NodeRef>();

    return _database->get_node(target_idx);
}

bool EdgeRef::is_valid() const {
    return _database != nullptr && _index >= 0 && _database->get_snapshot() != nullptr;
}

} // namespace godot
