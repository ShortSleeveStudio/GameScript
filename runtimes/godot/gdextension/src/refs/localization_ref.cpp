#include "localization_ref.h"
#include "../game_script_database.h"

namespace godot {

void LocalizationRef::_bind_methods() {
    ClassDB::bind_method(D_METHOD("get_index"), &LocalizationRef::get_index);
    ClassDB::bind_method(D_METHOD("get_id"), &LocalizationRef::get_id);
    ClassDB::bind_method(D_METHOD("get_name"), &LocalizationRef::get_name);
    ClassDB::bind_method(D_METHOD("get_subject_actor_idx"), &LocalizationRef::get_subject_actor_idx);
    ClassDB::bind_method(D_METHOD("get_subject_gender"), &LocalizationRef::get_subject_gender);
    ClassDB::bind_method(D_METHOD("get_is_templated"), &LocalizationRef::get_is_templated);
    ClassDB::bind_method(D_METHOD("get_variant_count"), &LocalizationRef::get_variant_count);
    ClassDB::bind_method(D_METHOD("get_variant_plural", "index"), &LocalizationRef::get_variant_plural);
    ClassDB::bind_method(D_METHOD("get_variant_gender", "index"), &LocalizationRef::get_variant_gender);
    ClassDB::bind_method(D_METHOD("get_variant_text", "index"), &LocalizationRef::get_variant_text);
    ClassDB::bind_method(D_METHOD("get_text"), &LocalizationRef::get_text);
    ClassDB::bind_method(D_METHOD("is_valid"), &LocalizationRef::is_valid);

    ADD_PROPERTY(PropertyInfo(Variant::INT, "index"), "", "get_index");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "id"), "", "get_id");
    ADD_PROPERTY(PropertyInfo(Variant::STRING, "name"), "", "get_name");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "subject_actor_idx"), "", "get_subject_actor_idx");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "subject_gender"), "", "get_subject_gender");
    ADD_PROPERTY(PropertyInfo(Variant::BOOL, "is_templated"), "", "get_is_templated");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "variant_count"), "", "get_variant_count");
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

int LocalizationRef::get_subject_actor_idx() const {
    const auto* loc = _get_localization();
    return loc ? loc->subject_actor_idx() : -1;
}

int LocalizationRef::get_subject_gender() const {
    const auto* loc = _get_localization();
    return loc ? static_cast<int>(loc->subject_gender()) : 0;
}

bool LocalizationRef::get_is_templated() const {
    const auto* loc = _get_localization();
    return loc ? loc->is_templated() : false;
}

int LocalizationRef::get_variant_count() const {
    const auto* loc = _get_localization();
    if (!loc || !loc->variants()) return 0;
    return static_cast<int>(loc->variants()->size());
}

int LocalizationRef::get_variant_plural(int index) const {
    const auto* loc = _get_localization();
    if (!loc || !loc->variants() || index < 0 || index >= static_cast<int>(loc->variants()->size()))
        return 5;  // PluralCategory::Other
    return static_cast<int>(loc->variants()->Get(index)->plural());
}

int LocalizationRef::get_variant_gender(int index) const {
    const auto* loc = _get_localization();
    if (!loc || !loc->variants() || index < 0 || index >= static_cast<int>(loc->variants()->size()))
        return 0;  // GenderCategory::Other
    return static_cast<int>(loc->variants()->Get(index)->gender());
}

String LocalizationRef::get_variant_text(int index) const {
    const auto* loc = _get_localization();
    if (!loc || !loc->variants() || index < 0 || index >= static_cast<int>(loc->variants()->size()))
        return String();
    const auto* text = loc->variants()->Get(index)->text();
    return text ? String::utf8(text->c_str()) : String();
}

String LocalizationRef::get_text() const {
    const auto* loc = _get_localization();
    if (!loc) return String();
    return resolve_text_static(loc, _database->get_snapshot());
}

bool LocalizationRef::is_valid() const {
    return _database != nullptr && _index >= 0 && _database->get_snapshot() != nullptr;
}

// Resolves gender from snapshot without a dynamic-actor provider.
// Dynamic grammatical gender falls back to GenderCategory::Other.
// Matches Unity's NodeRef.ResolveStaticGender.
int LocalizationRef::resolve_static_gender(const GameScript::Localization* loc, const GameScript::Snapshot* snapshot) {
    int actor_idx = loc->subject_actor_idx();
    if (actor_idx >= 0) {
        const auto* actors = snapshot->actors();
        if (actors && actor_idx < static_cast<int>(actors->size())) {
            GameScript::GrammaticalGender gg = actors->Get(actor_idx)->grammatical_gender();
            switch (gg) {
                case GameScript::GrammaticalGender_Masculine: return 1; // GenderCategory::Masculine
                case GameScript::GrammaticalGender_Feminine:  return 2; // GenderCategory::Feminine
                case GameScript::GrammaticalGender_Neuter:    return 3; // GenderCategory::Neuter
                default:                                      return 0; // Other + Dynamic
            }
        }
    }

    // Fall back to direct gender override (GenderCategory::Other when unset)
    return static_cast<int>(loc->subject_gender());
}

// Resolves the static-gender text for a localization entry.
// Uses 3-pass variant scan: exact -> gender fallback -> catch-all.
// Matches Unity's VariantResolver.Resolve with PluralCategory.Other.
String LocalizationRef::resolve_text_static(const GameScript::Localization* loc, const GameScript::Snapshot* snapshot) {
    const auto* variants = loc->variants();
    if (!variants) return String();

    int count = static_cast<int>(variants->size());
    if (count == 0) return String();

    int gender = resolve_static_gender(loc, snapshot);
    // PluralCategory::Other = 5
    int plural = 5;

    auto gender_cat = static_cast<GameScript::GenderCategory>(gender);
    auto plural_cat = static_cast<GameScript::PluralCategory>(plural);

    // Pass 1 - Exact: plural AND gender both match
    for (int i = 0; i < count; i++) {
        const auto* v = variants->Get(i);
        if (v->plural() == plural_cat && v->gender() == gender_cat) {
            if (!v->text()) return String();
            return String::utf8(v->text()->c_str());
        }
    }

    // Pass 2 - Gender fallback: plural matches, gender falls back to Other
    if (gender_cat != GameScript::GenderCategory_Other) {
        for (int i = 0; i < count; i++) {
            const auto* v = variants->Get(i);
            if (v->plural() == plural_cat && v->gender() == GameScript::GenderCategory_Other) {
                if (!v->text()) return String();
                return String::utf8(v->text()->c_str());
            }
        }
    }

    // Pass 3 - Catch-all: PluralCategory::Other AND GenderCategory::Other
    // Only needed when plural != Other. When plural IS Other, Pass 2 already
    // searched for (Other, Other) which is the catch-all, so repeating is redundant.
    if (plural_cat != GameScript::PluralCategory_Other) {
        for (int i = 0; i < count; i++) {
            const auto* v = variants->Get(i);
            if (v->plural() == GameScript::PluralCategory_Other && v->gender() == GameScript::GenderCategory_Other) {
                if (!v->text()) return String();
                return String::utf8(v->text()->c_str());
            }
        }
    }

    return String();
}

} // namespace godot
