import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import {
    TABLE_ID_EDGES,
    TABLE_ID_LOCALIZATIONS,
    TABLE_ID_NODES,
    TABLE_ID_ROUTINES,
    type Edge,
    type Localization,
    type Node,
    type Routine,
} from '@lib/api/db/db-schema';
import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
import { Undoable, undoManager } from '@lib/utility/undo-manager';
import type { DbConnection } from 'preload/api-db';

export async function nodeDeleteRemote(
    remote: Node,
    isLoading: IsLoadingStore,
    isUndoable: boolean = true,
    connection?: DbConnection,
): Promise<void> {
    // Detete node
    const nodeToDelete: Node = <Node>{ ...remote };
    let edgesToDelete: Edge[];
    let routinesToDelete: Routine[];
    let localizationsToDelete: Localization[];

    const deleteOperation: (conn: DbConnection) => Promise<void> = async (conn: DbConnection) => {
        // Delete Edges
        edgesToDelete = await db.fetchRowsRaw<Edge>(
            TABLE_ID_EDGES,
            createFilter()
                .where()
                .column('source')
                .eq(nodeToDelete.id)
                .or()
                .column('target')
                .eq(nodeToDelete.id)
                .endWhere()
                .build(),
            conn,
        );
        await db.deleteRows(TABLE_ID_EDGES, edgesToDelete, conn);

        // Delete Node
        await db.deleteRow(TABLE_ID_NODES, nodeToDelete, conn);

        // Delete Routines
        routinesToDelete = await db.fetchRowsRaw<Routine>(
            TABLE_ID_ROUTINES,
            createFilter()
                .where()
                .column('id')
                .in([nodeToDelete.code, nodeToDelete.condition])
                .endWhere()
                .build(),
            conn,
        );
        await db.deleteRows(TABLE_ID_ROUTINES, routinesToDelete, conn);

        // Delete Localizations
        localizationsToDelete = await db.fetchRowsRaw<Localization>(
            TABLE_ID_LOCALIZATIONS,
            createFilter()
                .where()
                .column('id')
                .in([nodeToDelete.uiText, nodeToDelete.voiceText])
                .endWhere()
                .build(),
            conn,
        );
        await db.deleteRows(TABLE_ID_LOCALIZATIONS, localizationsToDelete, conn);
    };

    if (connection) {
        await isLoading.wrapPromise(deleteOperation(connection));
    } else {
        await isLoading.wrapPromise(db.executeTransaction(deleteOperation));
    }

    // Register undo/redo
    if (!isUndoable) return;
    undoManager.register(
        new Undoable(
            'node deletion',
            isLoading.wrapFunction(async () => {
                await db.executeTransaction(async (conn: DbConnection) => {
                    await db.createRows(TABLE_ID_LOCALIZATIONS, localizationsToDelete, conn);
                    await db.createRows(TABLE_ID_ROUTINES, routinesToDelete, conn);
                    await db.createRow(TABLE_ID_NODES, nodeToDelete, conn);
                    await db.createRows(TABLE_ID_EDGES, edgesToDelete, conn);
                });
            }),
            isLoading.wrapFunction(async () => {
                await db.executeTransaction(async (conn: DbConnection) => {
                    await db.deleteRows(TABLE_ID_EDGES, edgesToDelete, conn);
                    await db.deleteRow(TABLE_ID_NODES, nodeToDelete, conn);
                    await db.deleteRows(TABLE_ID_ROUTINES, routinesToDelete, conn);
                    await db.deleteRows(TABLE_ID_LOCALIZATIONS, localizationsToDelete, conn);
                });
            }),
        ),
    );
}

export async function nodeDeleteFromConversationForever(): Promise<void> {}
