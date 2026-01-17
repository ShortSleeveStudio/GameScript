#include "actor_ref.h"
#include "../game_script_database.h"

namespace godot {

void ActorRef::_bind_methods() {
    ClassDB::bind_method(D_METHOD("get_index"), &ActorRef::get_index);
    ClassDB::bind_method(D_METHOD("get_id"), &ActorRef::get_id);
    ClassDB::bind_method(D_METHOD("get_name"), &ActorRef::get_name);
    ClassDB::bind_method(D_METHOD("get_localized_name"), &ActorRef::get_localized_name);
    ClassDB::bind_method(D_METHOD("get_color"), &ActorRef::get_color);
    ClassDB::bind_method(D_METHOD("is_valid"), &ActorRef::is_valid);

    ADD_PROPERTY(PropertyInfo(Variant::INT, "index"), "", "get_index");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "id"), "", "get_id");
    ADD_PROPERTY(PropertyInfo(Variant::STRING, "name"), "", "get_name");
    ADD_PROPERTY(PropertyInfo(Variant::STRING, "localized_name"), "", "get_localized_name");
    ADD_PROPERTY(PropertyInfo(Variant::STRING, "color"), "", "get_color");
}

ActorRef::ActorRef() : _database(nullptr), _index(-1) {
}

ActorRef::~ActorRef() {
}

void ActorRef::_init(GameScriptDatabase* database, int index) {
    _database = database;
    _index = index;
}

int ActorRef::get_index() const {
    return _index;
}

const GameScript::Actor* ActorRef::_get_actor() const {
    if (!is_valid()) return nullptr;
    return _database->get_snapshot()->actors()->Get(_index);
}

int ActorRef::get_id() const {
    const auto* actor = _get_actor();
    return actor ? actor->id() : -1;
}

String ActorRef::get_name() const {
    const auto* actor = _get_actor();
    if (!actor || !actor->name()) return String();
    return String::utf8(actor->name()->c_str());
}

String ActorRef::get_localized_name() const {
    const auto* actor = _get_actor();
    if (!actor || !actor->localized_name()) return String();
    return String::utf8(actor->localized_name()->c_str());
}

String ActorRef::get_color() const {
    const auto* actor = _get_actor();
    if (!actor || !actor->color()) return String();
    return String::utf8(actor->color()->c_str());
}

bool ActorRef::is_valid() const {
    return _database != nullptr && _index >= 0 && _database->get_snapshot() != nullptr;
}

} // namespace godot
