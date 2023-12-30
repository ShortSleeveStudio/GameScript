import { TypeNameToType } from '@lib/utility/type-helpers';

/**List of supported databases */
export const DATABASE_TYPE_NAMES = ['SQLite', 'PostgreSQL'] as const;

/**Database name type */
export type DatabaseTypeName = (typeof DATABASE_TYPE_NAMES)[number];

/**Database type name type */
export interface DatabaseType {
    id: number;
    name: DatabaseTypeName;
}

/**List of supported field types */
export const DATABASE_TYPES: DatabaseType[] = DATABASE_TYPE_NAMES.map<DatabaseType>(
    TypeNameToType<DatabaseTypeName, DatabaseType>,
);
