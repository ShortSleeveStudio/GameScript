import type { DbConnection } from '@common/common-db-types';
import type { Actor, Localization, Node } from '@common/common-schema';
import { TABLE_ACTORS, TABLE_LOCALIZATIONS, TABLE_NODES } from '@common/common-types';
import { createFilter } from '@lib/api/db/db-filter';
import type { Db } from '@lib/api/db/db-interface';
import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { Undoable, undoManager } from '@lib/utility/undo-manager';

interface ActorInfo {
    actor: Actor;
    localizedName: Localization;
}

export async function actorCreate(
    db: Db,
    toCreate: Actor,
    isLoading: IsLoadingStore,
    isUndoable: boolean = true,
): Promise<Actor> {
    return (await actorsCreate(db, [toCreate], isLoading, isUndoable))[0];
}

export async function actorsCreate(
    db: Db,
    toCreate: Actor[],
    isLoading: IsLoadingStore,
    isUndoable: boolean = true,
): Promise<Actor[]> {
    let actorInfos: ActorInfo[];
    const actorsToCreate: ActorInfo[] = [];
    for (let i = 0; i < toCreate.length; i++) {
        actorsToCreate.push(<ActorInfo>{
            actor: toCreate[i],
            localizedName: <Localization>{
                parent: null,
                is_system_created: true,
            },
        });
    }

    await isLoading.wrapPromise(
        db.executeTransaction(async (conn: DbConnection) => {
            actorInfos = await createOperation(db, actorsToCreate, conn);
        }),
    );

    // Register undo/redo
    if (isUndoable) {
        undoManager.register(
            new Undoable(
                'actor creation',
                isLoading.wrapFunction(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await deleteOperation(db, actorInfos, conn);
                    });
                }),
                isLoading.wrapFunction(async () => {
                    await db.executeTransaction(async (conn: DbConnection) => {
                        await createOperation(db, actorInfos, conn);
                    });
                }),
            ),
        );
    }
    return actorInfos.map((result) => result.actor);
}

export async function actorDelete(
    db: Db,
    toDelete: Actor,
    isLoading: IsLoadingStore,
    isUndoable: boolean = true,
): Promise<void> {
    await actorsDelete(db, [toDelete], isLoading, isUndoable);
}

export async function actorsDelete(
    db: Db,
    toDelete: Actor[],
    isLoading: IsLoadingStore,
    isUndoable: boolean = true,
): Promise<void> {
    const info: ActorInfo[] = [];
    await isLoading.wrapPromise(
        db.executeTransaction(async (conn: DbConnection) => {
            for (let i = 0; i < toDelete.length; i++) {
                // Fetch localization
                const actorToDelete: Actor = toDelete[i];
                const localizationsToDelete: Localization[] = await db.fetchRowsRaw<Localization>(
                    TABLE_LOCALIZATIONS,
                    createFilter()
                        .where()
                        .column('id')
                        .eq(actorToDelete.localized_name)
                        .endWhere()
                        .build(),
                );
                const localizationToDelete: Localization = localizationsToDelete[0];
                info.push(<ActorInfo>{
                    actor: actorToDelete,
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
                'actor deletion',
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
    toCreate: ActorInfo[],
    connection: DbConnection,
): Promise<ActorInfo[]> {
    const newActorInfos: ActorInfo[] = [];
    for (let i = 0; i < toCreate.length; i++) {
        const actorInfo: ActorInfo = toCreate[i];

        // Create localized name
        const newLocalization = await db.createRow(
            TABLE_LOCALIZATIONS,
            actorInfo.localizedName,
            connection,
        );

        // Create locale
        actorInfo.actor.localized_name = newLocalization.id;
        const newActor = await db.createRow(TABLE_ACTORS, actorInfo.actor, connection);

        // Save new actors
        newActorInfos.push(<ActorInfo>{
            actor: newActor,
            localizedName: newLocalization,
        });
    }
    return newActorInfos;
}

async function deleteOperation(
    db: Db,
    toDelete: ActorInfo[],
    connection: DbConnection,
): Promise<void> {
    for (let i = 0; i < toDelete.length; i++) {
        const actorInfo: ActorInfo = toDelete[i];
        await db.bulkUpdate(
            TABLE_NODES,
            <Node>{ actor: 0 },
            createFilter().where().column('actor').eq(actorInfo.actor.id).endWhere().build(),
        );
        await db.deleteRow(TABLE_ACTORS, actorInfo.actor, connection);
        await db.deleteRow(TABLE_LOCALIZATIONS, actorInfo.localizedName, connection);
    }
}
