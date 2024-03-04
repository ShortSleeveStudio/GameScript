import { DB_DEFAULT_LOCALE_ID } from '@common/common-db-initialization';
import type { DbConnection } from '@common/common-db-types';
import { localeIdToColumn } from '@common/common-locale';
import type { Locale, LocalePrincipal, Localization } from '@common/common-schema';
import {
    FIELD_TYPE_TEXT,
    TABLE_LOCALES,
    TABLE_LOCALE_PRINCIPAL,
    TABLE_LOCALIZATIONS,
} from '@common/common-types';
import { createEmptyFilter, createFilter } from '@lib/api/db/db-filter';
import type { Db } from '@lib/api/db/db-interface';
import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { Undoable, undoManager } from '@lib/utility/undo-manager';

interface LocaleInfo {
    locale: Locale;
    localizedName: Localization;
}

export async function localeCreate(
    db: Db,
    toCreate: Locale,
    isLoading: IsLoadingStore,
    isUndoable: boolean = true,
): Promise<Locale> {
    return await localesCreate(db, [toCreate], isLoading, isUndoable)[0];
}

export async function localesCreate(
    db: Db,
    toCreate: Locale[],
    isLoading: IsLoadingStore,
    isUndoable: boolean = true,
): Promise<Locale[]> {
    let info: LocaleInfo[];
    await isLoading.wrapPromise(
        db.executeTransaction(async (conn: DbConnection) => {
            const localesToCreate: LocaleInfo[] = [];
            for (let i = 0; i < toCreate.length; i++) {
                localesToCreate.push({
                    locale: toCreate[i],
                    localizedName: <Localization>{
                        parent: null,
                        isSystemCreated: true,
                    },
                });
            }
            info = await createOperation(db, localesToCreate, conn);
        }),
    );

    // Register undo/redo
    if (isUndoable) {
        undoManager.register(
            new Undoable(
                'locale creation',
                isLoading.wrapFunction(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await deleteOperation(db, info, conn);
                    });
                }),
                isLoading.wrapFunction(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await createOperation(db, info, conn);
                    });
                }),
            ),
        );
    }
    return info.map((result) => result.locale);
}

export async function localeDelete(
    db: Db,
    toDelete: Locale,
    isLoading: IsLoadingStore,
    isUndoable: boolean = true,
): Promise<void> {
    await localesDelete(db, [toDelete], isLoading, isUndoable);
}

export async function localesDelete(
    db: Db,
    toDelete: Locale[],
    isLoading: IsLoadingStore,
    isUndoable: boolean = true,
): Promise<void> {
    // Delete locale
    const info: LocaleInfo[] = [];
    await isLoading.wrapPromise(
        db.executeTransaction(async (conn: DbConnection) => {
            for (let i = 0; i < toDelete.length; i++) {
                // Fetch localization
                const localeToDelete: Locale = toDelete[i];
                const localizationToDelete: Localization = await db.fetchRowsRaw(
                    TABLE_LOCALES,
                    createFilter()
                        .where()
                        .column('id')
                        .eq(localeToDelete.localizedName)
                        .endWhere()
                        .build(),
                )[0];
                info.push({
                    locale: localeToDelete,
                    localizedName: localizationToDelete,
                });
            }
            await deleteOperation(db, info, conn);
        }),
    );

    // Register undo/redo
    if (isUndoable) {
        undoManager.register(
            new Undoable(
                'locale deletion',
                isLoading.wrapFunction(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await createOperation(db, info, conn);
                    });
                }),
                isLoading.wrapFunction(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await deleteOperation(db, info, conn);
                    });
                }),
            ),
        );
    }
}

async function createOperation(
    db: Db,
    localeInfos: LocaleInfo[],
    connection: DbConnection,
): Promise<LocaleInfo[]> {
    const newLocaleInfos: LocaleInfo[] = [];
    for (let i = 0; i < localeInfos.length; i++) {
        const localeInfo: LocaleInfo = localeInfos[i];

        // Create localized name
        const newLocalization = await db.createRow(
            TABLE_LOCALIZATIONS,
            localeInfo.localizedName,
            connection,
        );

        // Create locale
        localeInfo.locale.localizedName = newLocalization.id;
        const newLocale = await db.createRow(TABLE_LOCALES, localeInfo.locale, connection);

        // Alter localization table
        await db.createColumn(
            TABLE_LOCALIZATIONS,
            localeIdToColumn(newLocale.id),
            FIELD_TYPE_TEXT.id,
            connection,
        );
        newLocaleInfos.push(<LocaleInfo>{
            locale: newLocale,
            localizedName: newLocalization,
        });
    }
    return newLocaleInfos;
}

async function deleteOperation(
    db: Db,
    localeInfos: LocaleInfo[],
    connection: DbConnection,
): Promise<void> {
    // Ensure the principal is adjusted if needed
    const principal: LocalePrincipal = db.fetchRowsRaw(
        TABLE_LOCALE_PRINCIPAL,
        createEmptyFilter(),
        connection,
    )[0];

    for (let i = 0; i < localeInfos.length; i++) {
        const localeInfo: LocaleInfo = localeInfos[i];
        if (principal.principal === localeInfo.locale.id) {
            await db.updateRow(
                TABLE_LOCALE_PRINCIPAL,
                <LocalePrincipal>{ id: 0, principal: DB_DEFAULT_LOCALE_ID },
                connection,
            );
        }
        await db.deleteColumn(
            TABLE_LOCALIZATIONS,
            localeIdToColumn(localeInfo.locale.id),
            connection,
        );
        await db.deleteRow(TABLE_LOCALES, localeInfo.locale, connection);
        await db.deleteRow(TABLE_LOCALIZATIONS, localeInfo.localizedName, connection);
    }
}
