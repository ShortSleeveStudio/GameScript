#ifndef GAMESCRIPT_LOCALE_REF_H
#define GAMESCRIPT_LOCALE_REF_H

#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/core/class_db.hpp>

namespace godot {

// Forward declaration
class GameScriptManifest;

/// Lightweight wrapper providing read-only access to a Locale in the manifest.
///
/// OWNERSHIP MODEL: LocaleRef stores a raw pointer to GameScriptManifest. The manifest
/// must outlive all LocaleRef instances. This is safe because:
/// 1. LocaleRef instances are created on-demand by manifest queries
/// 2. They should be used immediately and not stored long-term
/// 3. The manifest is typically held for the app lifetime
///
/// If you need to reference a locale across frames, store the locale ID (get_id())
/// and re-query from the manifest when needed.
class LocaleRef : public RefCounted {
    GDCLASS(LocaleRef, RefCounted);

    friend class GameScriptManifest;

    GameScriptManifest* _manifest;  // Non-owning, must outlive this ref
    int _index;

protected:
    static void _bind_methods();

public:
    LocaleRef();
    ~LocaleRef();

    // Internal initialization (called by GameScriptManifest)
    void _init(GameScriptManifest* manifest, int index);

    // Properties
    int get_index() const;
    int get_id() const;
    String get_name() const;
    String get_localized_name() const;
    String get_hash() const;

    // Validity check
    bool is_valid() const;
};

} // namespace godot

#endif // GAMESCRIPT_LOCALE_REF_H
