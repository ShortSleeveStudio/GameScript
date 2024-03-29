import { TABLE_DEFINITION_ACTOR_PRINCIPAL } from '../table-definitions/table-definition-actor-principal';
import { TABLE_DEFINITION_ACTORS } from '../table-definitions/table-definition-actors';
import { TABLE_DEFINITION_AUTO_COMPLETES } from '../table-definitions/table-definition-auto-completes';
import { TABLE_DEFINITION_CONVERSATIONS } from '../table-definitions/table-definition-conversations';
import { TABLE_DEFINITION_EDGES } from '../table-definitions/table-definition-edges';
import { TABLE_DEFINITION_FILTERS } from '../table-definitions/table-definition-filters';
import { TABLE_DEFINITION_LOCALE_PRINCIPAL } from '../table-definitions/table-definition-locale-principal';
import { TABLE_DEFINITION_LOCALES } from '../table-definitions/table-definition-locales';
import { TABLE_DEFINITION_LOCALIZATIONS } from '../table-definitions/table-definition-localizations';
import { TABLE_DEFINITION_NODE_PROPERTIES } from '../table-definitions/table-definition-node-properties';
import { TABLE_DEFINITION_NODES } from '../table-definitions/table-definition-nodes';
import { TABLE_DEFINITION_NOTIFICATIONS } from '../table-definitions/table-definition-notification';
import { TABLE_DEFINITION_PROGRAMMING_LANGUAGE_PRINCIPAL } from '../table-definitions/table-definition-programming-language-principal';
import { TABLE_DEFINITION_PROGRAMMING_LANGUAGES } from '../table-definitions/table-definition-programming-languages';
import { TABLE_DEFINITION_PROPERTY_TEMPLATES } from '../table-definitions/table-definition-property-template';
import { TABLE_DEFINITION_PROPERTY_TYPES } from '../table-definitions/table-definition-property-types';
import { TABLE_DEFINITION_ROUTINE_TYPES } from '../table-definitions/table-definition-routine-types';
import { TABLE_DEFINITION_ROUTINES } from '../table-definitions/table-definition-routines';
import { TABLE_DEFINITION_TABLES } from '../table-definitions/table-definition-tables';
import { TABLE_DEFINITION_VERSION } from '../table-definitions/table-definition-version';
import { TableDefinition } from '../table-definitions/table-definitions';

export const TABLE_DEFINITIONS: TableDefinition[] = [
    TABLE_DEFINITION_TABLES,
    TABLE_DEFINITION_AUTO_COMPLETES,
    TABLE_DEFINITION_PROGRAMMING_LANGUAGES,
    TABLE_DEFINITION_PROGRAMMING_LANGUAGE_PRINCIPAL,
    TABLE_DEFINITION_FILTERS,
    TABLE_DEFINITION_CONVERSATIONS,
    TABLE_DEFINITION_ROUTINE_TYPES,
    TABLE_DEFINITION_ROUTINES,
    TABLE_DEFINITION_LOCALIZATIONS,
    TABLE_DEFINITION_LOCALES,
    TABLE_DEFINITION_LOCALE_PRINCIPAL,
    TABLE_DEFINITION_ACTORS,
    TABLE_DEFINITION_ACTOR_PRINCIPAL,
    TABLE_DEFINITION_NODES,
    TABLE_DEFINITION_EDGES,
    TABLE_DEFINITION_VERSION,
    TABLE_DEFINITION_NOTIFICATIONS,
    TABLE_DEFINITION_PROPERTY_TYPES,
    TABLE_DEFINITION_PROPERTY_TEMPLATES,
    TABLE_DEFINITION_NODE_PROPERTIES,
];
