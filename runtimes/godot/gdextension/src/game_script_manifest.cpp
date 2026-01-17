#include "game_script_manifest.h"
#include "game_script_database.h"
#include "refs/locale_ref.h"

#include <godot_cpp/classes/file_access.hpp>
#include <godot_cpp/classes/json.hpp>
#include <godot_cpp/variant/utility_functions.hpp>

namespace godot {

void GameScriptManifest::_bind_methods() {
    ClassDB::bind_static_method("GameScriptManifest", D_METHOD("load_from_path", "manifest_path"), &GameScriptManifest::load_from_path);

    ClassDB::bind_method(D_METHOD("get_version"), &GameScriptManifest::get_version);
    ClassDB::bind_method(D_METHOD("get_exported_at"), &GameScriptManifest::get_exported_at);
    ClassDB::bind_method(D_METHOD("get_locale_count"), &GameScriptManifest::get_locale_count);
    ClassDB::bind_method(D_METHOD("get_locale", "index"), &GameScriptManifest::get_locale);
    ClassDB::bind_method(D_METHOD("get_primary_locale"), &GameScriptManifest::get_primary_locale);
    ClassDB::bind_method(D_METHOD("find_locale", "id"), &GameScriptManifest::find_locale);
    ClassDB::bind_method(D_METHOD("find_locale_by_name", "name"), &GameScriptManifest::find_locale_by_name);
    ClassDB::bind_method(D_METHOD("has_locale", "id"), &GameScriptManifest::has_locale);
    ClassDB::bind_method(D_METHOD("has_locale_by_name", "name"), &GameScriptManifest::has_locale_by_name);
    ClassDB::bind_method(D_METHOD("load_database", "locale"), &GameScriptManifest::load_database);
    ClassDB::bind_method(D_METHOD("load_database_primary"), &GameScriptManifest::load_database_primary);

    ADD_PROPERTY(PropertyInfo(Variant::STRING, "version"), "", "get_version");
    ADD_PROPERTY(PropertyInfo(Variant::STRING, "exported_at"), "", "get_exported_at");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "locale_count"), "", "get_locale_count");
}

GameScriptManifest::GameScriptManifest() : _primary_locale_index(0) {
}

GameScriptManifest::~GameScriptManifest() {
}

Ref<GameScriptManifest> GameScriptManifest::load_from_path(const String& manifest_path) {
    Ref<FileAccess> file = FileAccess::open(manifest_path, FileAccess::READ);
    if (!file.is_valid()) {
        UtilityFunctions::push_error("GameScriptManifest: Failed to open manifest file: ", manifest_path);
        return Ref<GameScriptManifest>();
    }

    String json_text = file->get_as_text();
    file->close();

    Ref<JSON> json;
    json.instantiate();
    Error err = json->parse(json_text);
    if (err != OK) {
        UtilityFunctions::push_error("GameScriptManifest: Failed to parse manifest JSON: ", json->get_error_message());
        return Ref<GameScriptManifest>();
    }

    Dictionary data = json->get_data();

    Ref<GameScriptManifest> manifest;
    manifest.instantiate();

    // Extract base path from manifest path (directory containing manifest.json)
    int last_slash = manifest_path.rfind("/");
    if (last_slash >= 0) {
        manifest->_base_path = manifest_path.substr(0, last_slash);
    } else {
        manifest->_base_path = "";
    }

    manifest->_version = data.get("version", "");
    manifest->_exported_at = data.get("exportedAt", "");
    manifest->_primary_locale_index = data.get("primaryLocale", 0);

    Array locales_array = data.get("locales", Array());
    manifest->_locales.resize(locales_array.size());

    for (int i = 0; i < locales_array.size(); i++) {
        Dictionary locale_dict = locales_array[i];
        ManifestLocale& locale = manifest->_locales.write[i];
        locale.id = locale_dict.get("id", 0);
        locale.name = locale_dict.get("name", "");
        locale.localized_name = locale_dict.get("localizedName", "");
        locale.hash = locale_dict.get("hash", "");
    }

    return manifest;
}

String GameScriptManifest::get_version() const {
    return _version;
}

String GameScriptManifest::get_exported_at() const {
    return _exported_at;
}

int GameScriptManifest::get_locale_count() const {
    return _locales.size();
}

Ref<LocaleRef> GameScriptManifest::get_locale(int index) {
    if (index < 0 || index >= _locales.size()) {
        return Ref<LocaleRef>();
    }

    Ref<LocaleRef> locale_ref;
    locale_ref.instantiate();
    locale_ref->_init(this, index);
    return locale_ref;
}

Ref<LocaleRef> GameScriptManifest::get_primary_locale() {
    int index = _primary_locale_index;
    if (index < 0 || index >= _locales.size()) {
        index = 0;
    }
    if (_locales.size() == 0) {
        return Ref<LocaleRef>();
    }
    return get_locale(index);
}

Ref<LocaleRef> GameScriptManifest::find_locale(int id) {
    for (int i = 0; i < _locales.size(); i++) {
        if (_locales[i].id == id) {
            return get_locale(i);
        }
    }
    UtilityFunctions::push_error("GameScriptManifest: Locale with ID ", id, " not found");
    return Ref<LocaleRef>();
}

Ref<LocaleRef> GameScriptManifest::find_locale_by_name(const String& name) {
    for (int i = 0; i < _locales.size(); i++) {
        if (_locales[i].name == name) {
            return get_locale(i);
        }
    }
    UtilityFunctions::push_error("GameScriptManifest: Locale with name '", name, "' not found");
    return Ref<LocaleRef>();
}

bool GameScriptManifest::try_find_locale(int id, Ref<LocaleRef>& out_locale) {
    for (int i = 0; i < _locales.size(); i++) {
        if (_locales[i].id == id) {
            out_locale = get_locale(i);
            return true;
        }
    }
    out_locale = Ref<LocaleRef>();
    return false;
}

bool GameScriptManifest::try_find_locale_by_name(const String& name, Ref<LocaleRef>& out_locale) {
    for (int i = 0; i < _locales.size(); i++) {
        if (_locales[i].name == name) {
            out_locale = get_locale(i);
            return true;
        }
    }
    out_locale = Ref<LocaleRef>();
    return false;
}

Ref<GameScriptDatabase> GameScriptManifest::load_database(Ref<LocaleRef> locale) {
    if (!locale.is_valid() || !locale->is_valid()) {
        UtilityFunctions::push_error("GameScriptManifest: Invalid locale provided to load_database");
        return Ref<GameScriptDatabase>();
    }

    return GameScriptDatabase::create(this, locale->get_index());
}

Ref<GameScriptDatabase> GameScriptManifest::load_database_primary() {
    Ref<LocaleRef> locale = get_primary_locale();
    if (!locale.is_valid()) {
        UtilityFunctions::push_error("GameScriptManifest: No primary locale available");
        return Ref<GameScriptDatabase>();
    }
    return load_database(locale);
}

// Internal accessors for LocaleRef
int GameScriptManifest::get_locale_id(int index) const {
    if (index < 0 || index >= _locales.size()) return -1;
    return _locales[index].id;
}

String GameScriptManifest::get_locale_name(int index) const {
    if (index < 0 || index >= _locales.size()) return String();
    return _locales[index].name;
}

String GameScriptManifest::get_locale_localized_name(int index) const {
    if (index < 0 || index >= _locales.size()) return String();
    return _locales[index].localized_name;
}

String GameScriptManifest::get_locale_hash(int index) const {
    if (index < 0 || index >= _locales.size()) return String();
    return _locales[index].hash;
}

String GameScriptManifest::get_snapshot_path(int locale_index) const {
    if (locale_index < 0 || locale_index >= _locales.size()) {
        return String();
    }
    return _base_path + String("/locales/") + _locales[locale_index].name + String(".gsb");
}

bool GameScriptManifest::has_locale(int id) const {
    for (int i = 0; i < _locales.size(); i++) {
        if (_locales[i].id == id) {
            return true;
        }
    }
    return false;
}

bool GameScriptManifest::has_locale_by_name(const String& name) const {
    for (int i = 0; i < _locales.size(); i++) {
        if (_locales[i].name == name) {
            return true;
        }
    }
    return false;
}

} // namespace godot
