#ifndef GAMESCRIPT_MANIFEST_H
#define GAMESCRIPT_MANIFEST_H

#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/variant/typed_array.hpp>

namespace godot {

class LocaleRef;
class GameScriptDatabase;

// Internal structure for manifest locale data
struct ManifestLocale {
    int id;
    String name;
    String localized_name;
    String hash;
};

class GameScriptManifest : public RefCounted {
    GDCLASS(GameScriptManifest, RefCounted);

    friend class LocaleRef;
    friend class GameScriptDatabase;

    String _version;
    String _exported_at;
    String _base_path;
    Vector<ManifestLocale> _locales;
    int _primary_locale_index;

protected:
    static void _bind_methods();

public:
    GameScriptManifest();
    ~GameScriptManifest();

    // Factory method - loads manifest from JSON file
    static Ref<GameScriptManifest> load_from_path(const String& manifest_path);

    // Properties
    String get_version() const;
    String get_exported_at() const;
    int get_locale_count() const;
    Ref<LocaleRef> get_locale(int index);
    Ref<LocaleRef> get_primary_locale();

    // Lookup methods
    Ref<LocaleRef> find_locale(int id);
    Ref<LocaleRef> find_locale_by_name(const String& name);
    bool try_find_locale(int id, Ref<LocaleRef>& out_locale);
    bool try_find_locale_by_name(const String& name, Ref<LocaleRef>& out_locale);

    // GDScript-friendly existence checks (since try_find_* can't bind due to out params)
    bool has_locale(int id) const;
    bool has_locale_by_name(const String& name) const;

    // Database creation
    Ref<GameScriptDatabase> load_database(Ref<LocaleRef> locale);
    Ref<GameScriptDatabase> load_database_primary();

    // Internal accessors for LocaleRef
    int get_locale_id(int index) const;
    String get_locale_name(int index) const;
    String get_locale_localized_name(int index) const;
    String get_locale_hash(int index) const;

    // Internal accessor for Database
    String get_snapshot_path(int locale_index) const;
    String get_base_path() const { return _base_path; }
};

} // namespace godot

#endif // GAMESCRIPT_MANIFEST_H
