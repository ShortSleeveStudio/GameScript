#include "locale_ref.h"
#include "../game_script_manifest.h"

namespace godot {

void LocaleRef::_bind_methods() {
    ClassDB::bind_method(D_METHOD("get_index"), &LocaleRef::get_index);
    ClassDB::bind_method(D_METHOD("get_id"), &LocaleRef::get_id);
    ClassDB::bind_method(D_METHOD("get_name"), &LocaleRef::get_name);
    ClassDB::bind_method(D_METHOD("get_localized_name"), &LocaleRef::get_localized_name);
    ClassDB::bind_method(D_METHOD("get_hash"), &LocaleRef::get_hash);
    ClassDB::bind_method(D_METHOD("is_valid"), &LocaleRef::is_valid);

    ADD_PROPERTY(PropertyInfo(Variant::INT, "index"), "", "get_index");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "id"), "", "get_id");
    ADD_PROPERTY(PropertyInfo(Variant::STRING, "name"), "", "get_name");
    ADD_PROPERTY(PropertyInfo(Variant::STRING, "localized_name"), "", "get_localized_name");
    ADD_PROPERTY(PropertyInfo(Variant::STRING, "hash"), "", "get_hash");
}

LocaleRef::LocaleRef() : _manifest(nullptr), _index(-1) {
}

LocaleRef::~LocaleRef() {
}

void LocaleRef::_init(GameScriptManifest* manifest, int index) {
    _manifest = manifest;
    _index = index;
}

int LocaleRef::get_index() const {
    return _index;
}

int LocaleRef::get_id() const {
    if (!is_valid()) return -1;
    return _manifest->get_locale_id(_index);
}

String LocaleRef::get_name() const {
    if (!is_valid()) return String();
    return _manifest->get_locale_name(_index);
}

String LocaleRef::get_localized_name() const {
    if (!is_valid()) return String();
    return _manifest->get_locale_localized_name(_index);
}

String LocaleRef::get_hash() const {
    if (!is_valid()) return String();
    return _manifest->get_locale_hash(_index);
}

bool LocaleRef::is_valid() const {
    return _manifest != nullptr && _index >= 0;
}

} // namespace godot
