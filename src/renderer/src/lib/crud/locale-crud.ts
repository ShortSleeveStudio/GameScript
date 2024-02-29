import type { DbConnection } from '@common/common-db-types';
import { localeIdToColumn } from '@common/common-locale';
import type { Locale, LocalePrincipal, Localization } from '@common/common-schema';
import {
    FIELD_TYPE_TEXT,
    TABLE_LOCALES,
    TABLE_LOCALE_PRINCIPAL,
    TABLE_LOCALIZATIONS,
} from '@common/common-types';
import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { localePrincipalTableView } from '@lib/tables/locale-principal';
import { systemCreatedLocaleRowView } from '@lib/tables/locale-system-created';
import { Undoable, undoManager } from '@lib/utility/undo-manager';
import { get } from 'svelte/store';

interface LocaleInfo {
    locale: Locale;
    localizedName: Localization;
}

export async function localeCreate(
    toCreate: Locale,
    isLoading: IsLoadingStore,
    isUndoable: boolean = true,
): Promise<Locale> {
    return await localesCreate([toCreate], isLoading, isUndoable)[0];
}

export async function localesCreate(
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
            info = await createOperation(localesToCreate, conn);
        }),
    );

    // Register undo/redo
    if (isUndoable) {
        undoManager.register(
            new Undoable(
                'locale creation',
                isLoading.wrapFunction(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await deleteOperation(info, conn);
                    });
                }),
                isLoading.wrapFunction(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await createOperation(info, conn);
                    });
                }),
            ),
        );
    }
    return info.map((result) => result.locale);
}

export async function localeDelete(
    toDelete: Locale,
    isLoading: IsLoadingStore,
    isUndoable: boolean = true,
): Promise<void> {
    await localesDelete([toDelete], isLoading, isUndoable);
}

export async function localesDelete(
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
            await deleteOperation(info, conn);
        }),
    );

    // Register undo/redo
    if (isUndoable) {
        undoManager.register(
            new Undoable(
                'locale deletion',
                isLoading.wrapFunction(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await createOperation(info, conn);
                    });
                }),
                isLoading.wrapFunction(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await deleteOperation(info, conn);
                    });
                }),
            ),
        );
    }
}

async function createOperation(
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

async function deleteOperation(localeInfos: LocaleInfo[], connection: DbConnection): Promise<void> {
    // Ensure the principal is adjusted if needed
    const principal: LocalePrincipal = get(get(localePrincipalTableView)[0]);
    for (let i = 0; i < localeInfos.length; i++) {
        const localeInfo: LocaleInfo = localeInfos[i];
        if (principal.principal === localeInfo.locale.id) {
            await db.updateRow(
                TABLE_LOCALE_PRINCIPAL,
                <LocalePrincipal>{ id: 0, principal: systemCreatedLocaleRowView.id },
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
