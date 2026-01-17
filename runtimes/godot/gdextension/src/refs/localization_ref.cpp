#include "localization_ref.h"
#include "../game_script_database.h"

namespace godot {

void LocalizationRef::_bind_methods() {
    ClassDB::bind_method(D_METHOD("get_index"), &LocalizationRef::get_index);
    ClassDB::bind_method(D_METHOD("get_id"), &LocalizationRef::get_id);
    ClassDB::bind_method(D_METHOD("get_name"), &LocalizationRef::get_name);
    ClassDB::bind_method(D_METHOD("get_text"), &LocalizationRef::get_text);
    ClassDB::bind_method(D_METHOD("is_valid"), &LocalizationRef::is_valid);

    ADD_PROPERTY(PropertyInfo(Variant::INT, "index"), "", "get_index");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "id"), "", "get_id");
    ADD_PROPERTY(PropertyInfo(Variant::STRING, "name"), "", "get_name");
    ADD_PROPERTY(PropertyInfo(Variant::STRING, "text"), "", "get_text");
}

LocalizationRef::LocalizationRef() : _database(nullptr), _index(-1) {
}

LocalizationRef::~LocalizationRef() {
}

void LocalizationRef::_init(GameScriptDatabase* database, int index) {
    _database = database;
    _index = index;
}

int LocalizationRef::get_index() const {
    return _index;
}

const GameScript::Localization* LocalizationRef::_get_localization() const {
    if (!is_valid()) return nullptr;
    return _database->get_snapshot()->localizations()->Get(_index);
}

int LocalizationRef::get_id() const {
    const auto* loc = _get_localization();
    return loc ? loc->id() : -1;
}

String LocalizationRef::get_name() const {
    const auto* loc = _get_localization();
    if (!loc || !loc->name()) return String();
    return String::utf8(loc->name()->c_str());
}

String LocalizationRef::get_text() const {
    const auto* loc = _get_localization();
    if (!loc || !loc->text()) return String();
    return String::utf8(loc->text()->c_str());
}

bool LocalizationRef::is_valid() const {
    return _database != nullptr && _index >= 0 && _database->get_snapshot() != nullptr;
}

} // namespace godot
