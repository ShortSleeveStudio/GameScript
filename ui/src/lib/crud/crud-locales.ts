import { db } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import {
  query,
  localeIdToColumn,
  type Locale,
  type LocalePrincipal,
  type Localization,
  TABLE_LOCALIZATIONS,
  TABLE_LOCALES,
  TABLE_LOCALE_PRINCIPAL,
  DB_DEFAULT_LOCALE_ID,
} from '@gamescript/shared';

// ============================================================================
// Read
// ============================================================================

export async function getAll(): Promise<Locale[]> {
  return db.select<Locale>(TABLE_LOCALES, query<Locale>().build());
}

export async function getById(id: number): Promise<Locale | null> {
  return db.selectById<Locale>(TABLE_LOCALES, id);
}

// ============================================================================
// Types
// ============================================================================

export interface CreateLocaleResult {
  locale: Locale;
  localizedNameId: number;
}

// ============================================================================
// Create
// ============================================================================

export async function create(name: string): Promise<CreateLocaleResult> {
  let locale: Locale | undefined;
  let localization: Localization | undefined;

  await db.transaction(async (tx) => {
    // 1. Create localization for the locale's localized name
    localization = await db.insert<Localization>(
      TABLE_LOCALIZATIONS,
      {
        parent: null as any,
        name: null as any,
        is_system_created: true,
      },
      tx
    );

    // 2. Create the locale
    locale = await db.insert<Locale>(
      TABLE_LOCALES,
      {
        name,
        localized_name: localization.id,
        is_system_created: false,
      },
      tx
    );

    // 3. Add locale column to localizations table
    const columnName = localeIdToColumn(locale.id);
    await db.addColumn(TABLE_LOCALIZATIONS, columnName, 'TEXT', tx);
  });

  if (!locale || !localization) throw new Error('Failed to create locale');

  const capturedLocale = { ...locale };
  const capturedLocalization = { ...localization };

  registerUndoable(
    new Undoable(
      `Create locale "${name}"`,
      async () => {
        await deleteInternal(capturedLocale.id);
      },
      async () => {
        // Redo: restore in transaction
        await db.transaction(async (tx) => {
          await db.insertWithId<Localization>(TABLE_LOCALIZATIONS, capturedLocalization, tx);
          await db.insertWithId<Locale>(TABLE_LOCALES, capturedLocale, tx);
          const columnName = localeIdToColumn(capturedLocale.id);
          await db.addColumn(TABLE_LOCALIZATIONS, columnName, 'TEXT', tx);
        });
      }
    )
  );

  return { locale, localizedNameId: localization.id };
}

// ============================================================================
// Update
// ============================================================================

export async function updateMany(oldLocales: Locale[], newLocales: Locale[]): Promise<Locale[]> {
  const results = await db.updateRows<Locale>(TABLE_LOCALES, newLocales);

  registerUndoable(
    new Undoable(
      oldLocales.length > 1 ? 'Update locales' : 'Update locale',
      async () => {
        await db.updateRows(TABLE_LOCALES, oldLocales);
      },
      async () => {
        await db.updateRows(TABLE_LOCALES, newLocales);
      }
    )
  );

  return results;
}

export async function updateOne(oldLocale: Locale, newLocale: Locale): Promise<Locale> {
  const results = await updateMany([oldLocale], [newLocale]);
  return results[0];
}

// ============================================================================
// Delete
// ============================================================================

export async function remove(localeId: number): Promise<void> {
  const locale = await db.selectById<Locale>(TABLE_LOCALES, localeId);
  if (!locale) throw new Error(`Locale ${localeId} not found`);

  // Capture localization for undo
  const localization = locale.localized_name
    ? await db.selectById<Localization>(TABLE_LOCALIZATIONS, locale.localized_name)
    : null;

  // Check if this is the principal locale
  const principals = await db.select<LocalePrincipal>(
    TABLE_LOCALE_PRINCIPAL,
    query<LocalePrincipal>().build()
  );
  const wasPrincipal = principals.length > 0 && principals[0].principal === localeId;

  await deleteInternal(localeId);

  const capturedLocale = { ...locale };
  const capturedLocalization = localization ? { ...localization } : null;
  const capturedWasPrincipal = wasPrincipal;

  registerUndoable(
    new Undoable(
      `Delete locale "${locale.name}"`,
      async () => {
        // Use transaction to restore atomically
        await db.transaction(async (tx) => {
          // Restore localization first (locale references it)
          if (capturedLocalization) {
            await db.insertWithId<Localization>(TABLE_LOCALIZATIONS, capturedLocalization, tx);
          }
          // Restore locale
          await db.insertWithId<Locale>(TABLE_LOCALES, capturedLocale, tx);
          // Re-add locale column
          const columnName = localeIdToColumn(capturedLocale.id);
          await db.addColumn(TABLE_LOCALIZATIONS, columnName, 'TEXT', tx);
          // Restore principal if it was principal before
          if (capturedWasPrincipal) {
            const principals = await db.select<LocalePrincipal>(
              TABLE_LOCALE_PRINCIPAL,
              query<LocalePrincipal>().build(),
              tx
            );
            if (principals.length > 0) {
              await db.updatePartial<LocalePrincipal>(
                TABLE_LOCALE_PRINCIPAL,
                principals[0].id,
                { principal: capturedLocale.id },
                tx
              );
            }
          }
        });
      },
      async () => {
        await deleteInternal(capturedLocale.id);
      }
    )
  );
}


// ============================================================================
// Internal
// ============================================================================

async function deleteInternal(localeId: number): Promise<void> {
  await db.transaction(async (tx) => {
    const locale = await db.selectById<Locale>(TABLE_LOCALES, localeId, tx);
    if (!locale) throw new Error(`Locale ${localeId} not found`);

    // Reset principal if this is the principal locale
    const principals = await db.select<LocalePrincipal>(
      TABLE_LOCALE_PRINCIPAL,
      query<LocalePrincipal>().build(),
      tx
    );
    if (principals.length > 0 && principals[0].principal === localeId) {
      await db.updatePartial<LocalePrincipal>(
        TABLE_LOCALE_PRINCIPAL,
        principals[0].id,
        { principal: DB_DEFAULT_LOCALE_ID },
        tx
      );
    }

    // Drop locale column
    const columnName = localeIdToColumn(localeId);
    await db.dropColumn(TABLE_LOCALIZATIONS, columnName, tx);

    // Delete locale
    await db.delete(TABLE_LOCALES, localeId, tx);

    // Delete localized name
    if (locale.localized_name) {
      await db.delete(TABLE_LOCALIZATIONS, locale.localized_name, tx);
    }
  });
}
