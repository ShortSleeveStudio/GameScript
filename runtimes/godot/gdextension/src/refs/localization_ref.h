#ifndef GAMESCRIPT_LOCALIZATION_REF_H
#define GAMESCRIPT_LOCALIZATION_REF_H

#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/core/class_db.hpp>

namespace GameScript {
struct Localization;  // Forward declaration for private helper
struct Snapshot;      // Forward declaration for resolve helpers
}

namespace godot {

class GameScriptDatabase;

/// Lightweight wrapper providing read-only access to a Localization entry in the snapshot.
///
/// OWNERSHIP MODEL: LocalizationRef stores a raw pointer to GameScriptDatabase. The database
/// must outlive all LocalizationRef instances. This is safe because:
/// 1. LocalizationRef instances are created on-demand by database queries
/// 2. They should be used immediately and not stored long-term
/// 3. The database is typically held by GameScriptRunner for the app lifetime
///
/// If you need to reference a localization across frames, store the localization ID (get_id())
/// and re-query from the database when needed.
class LocalizationRef : public RefCounted {
    GDCLASS(LocalizationRef, RefCounted);

    friend class GameScriptDatabase;

    GameScriptDatabase* _database;  // Non-owning, must outlive this ref
    int _index;

    // Private helper to reduce repeated snapshot access
    const GameScript::Localization* _get_localization() const;

protected:
    static void _bind_methods();

public:
    LocalizationRef();
    ~LocalizationRef();

    void _init(GameScriptDatabase* database, int index);

    // Properties
    int get_index() const;
    int get_id() const;
    String get_name() const;
    int get_subject_actor_idx() const;
    int get_subject_gender() const;
    bool get_is_templated() const;
    int get_variant_count() const;

    // Per-variant accessors (for GDScript variant resolver)
    int get_variant_plural(int index) const;
    int get_variant_gender(int index) const;
    String get_variant_text(int index) const;

    // Static-gender-resolved text (convenience accessor)
    // Resolves gender from snapshot only (no template substitution).
    // Dynamic actors default to GenderCategory::Other.
    // Plural defaults to PluralCategory::Other.
    String get_text() const;

    bool is_valid() const;

    // Shared helpers for variant resolution (used by ActorRef and NodeRef)
    static int resolve_static_gender(const GameScript::Localization* loc, const GameScript::Snapshot* snapshot);
    static String resolve_text_static(const GameScript::Localization* loc, const GameScript::Snapshot* snapshot);
};

} // namespace godot

#endif // GAMESCRIPT_LOCALIZATION_REF_H
