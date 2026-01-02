# GameScript Snapshot Format

Per-locale binary snapshots (.gsb) for game engine runtimes.

**Schema definition:** [core/schema/snapshot.fbs](core/schema/snapshot.fbs)

## Design Principles

- **Per-locale snapshots**: Localized text resolved at export time
- **Index-based references**: O(1) lookups via array indices (not database IDs)
- **Database IDs preserved**: For condition/action function binding

---

## Tag System

Tags organize conversations and localizations. Each entity type has independent tag categories.

**Storage:**
- `*_tag_names`: Category names, e.g., `["Act", "Location", "Quest"]`
- `*_tag_values`: Values per category, e.g., `[["Act One", "Act Two"], ["Docks", "Castle"], ["Main", "Side"]]`

**Usage:** Entity's `tag_indices[i]` points into `*_tag_values[i]`. Value of `-1` means untagged.

---

## File Structure

```
/GameScript/
  manifest.json
  /locales/
    en.gsb
    fr.gsb
    ...
```

**manifest.json:**
```json
{
  "version": "1.0.0",
  "locales": [
    { "id": 1, "name": "en", "localizedName": "English", "hash": "abc123..." },
    { "id": 2, "name": "fr", "localizedName": "Français", "hash": "def456..." },
    { "id": 3, "name": "de", "localizedName": "Deutsch", "hash": "ghi789..." }
  ],
  "primaryLocale": 1,
  "exportedAt": "2025-01-15T10:30:00Z"
}
```

---

## Export Rules

| Included | Excluded |
|----------|----------|
| Active conversations, nodes, edges | Deleted items (`is_deleted = true`) |
| All actors | System-created metadata rows |
| Non-system localizations | Authoring-only fields (edge notes) |
| Tags and properties | |

**Trigger:** IDE focus loss or manual export. Atomic writes via temp file + rename.
