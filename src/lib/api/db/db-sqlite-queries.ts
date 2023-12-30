import {
    FIELD_TYPES,
    FIELD_TYPE_ID_ACTOR,
    FIELD_TYPE_ID_BOOLEAN,
    FIELD_TYPE_ID_CODE,
    FIELD_TYPE_ID_COLOR,
    FIELD_TYPE_ID_LOCALIZED_TEXT,
    FIELD_TYPE_ID_TEXT,
    NODE_TYPES,
    NODE_TYPE_ID_ACTOR,
    NODE_TYPE_ID_AUTO_COMPLETE,
    NODE_TYPE_ID_DEFAULT_FIELD,
    NODE_TYPE_ID_DIALOGUE,
    NODE_TYPE_ID_LOCALE,
    NODE_TYPE_ID_LOCALIZATION,
    NODE_TYPE_ID_LOCALIZATION_TABLE,
    NODE_TYPE_ID_PROGRAMMING_LANGUAGE,
    NODE_TYPE_ID_ROUTINE,
    TABLE_NAME_FIELDS,
    TABLE_NAME_FIELD_TYPES,
    TABLE_NAME_NODES,
    TABLE_NAME_NODE_TYPES,
    type NodeTypeRow,
} from './db-schema';

///
/// Table Creation
///
const CREATE_TABLE_NODE_TYPES = `
CREATE TABLE IF NOT EXISTS "${TABLE_NAME_NODE_TYPES}" (
	"id"	INTEGER,
	"name"	TEXT NOT NULL UNIQUE,
	PRIMARY KEY("id" AUTOINCREMENT)
);`;
const CREATE_TABLE_FIELD_TYPES = `
CREATE TABLE IF NOT EXISTS "${TABLE_NAME_FIELD_TYPES}" (
	"id"	INTEGER,
	"name"	TEXT NOT NULL UNIQUE,
	PRIMARY KEY("id" AUTOINCREMENT)
);`;
const CREATE_TABLE_NODES = `
CREATE TABLE IF NOT EXISTS "${TABLE_NAME_NODES}" (
	"id"	INTEGER,
	"parent"	INTEGER,
	"type"	INTEGER NOT NULL,
	"name"	TEXT,
	"isFolder"	INTEGER NOT NULL,
    UNIQUE("parent","name","type"),
	FOREIGN KEY("type") REFERENCES "${TABLE_NAME_NODE_TYPES}",
	FOREIGN KEY("parent") REFERENCES "${TABLE_NAME_NODES}",
	PRIMARY KEY("id" AUTOINCREMENT)
);
`;
const CREATE_TABLE_FIELDS = `
CREATE TABLE IF NOT EXISTS "${TABLE_NAME_FIELDS}" (
	"id"	INTEGER,
	"parent"	INTEGER NOT NULL,
	"type"	INTEGER NOT NULL,
	"name"	TEXT NOT NULL,
	"isDefault"	INTEGER NOT NULL,
	"bool"	INTEGER,
	"code"	TEXT,
	"text"	TEXT,
	"color"	TEXT,
	"decimal"	NUMERIC,
	"integer"	INTEGER,
	"reference"	INTEGER,
	FOREIGN KEY("parent") REFERENCES "${TABLE_NAME_NODES}",
	FOREIGN KEY("reference") REFERENCES "${TABLE_NAME_NODES}",
	UNIQUE("parent","name","type"),
	PRIMARY KEY("id" AUTOINCREMENT)
);
`;
export const CREATE_TABLE_QUERIES = [
    CREATE_TABLE_NODE_TYPES,
    CREATE_TABLE_FIELD_TYPES,
    CREATE_TABLE_NODES,
    CREATE_TABLE_FIELDS,
];

///
/// Table Initialization
///
// Node Types
const INITIALIZE_NODE_TYPES = `
BEGIN TRANSACTION;
${NODE_TYPES.map(
    (nodeType) =>
        `INSERT OR IGNORE INTO ${TABLE_NAME_NODE_TYPES} (id, name) VALUES(${nodeType.id}, '${nodeType.name}');`,
).join('\n')}
COMMIT;
`;
// Field Types
const INITIALIZE_FIELD_TYPES = `
BEGIN TRANSACTION;
${FIELD_TYPES.map(
    (fieldType) =>
        `INSERT OR IGNORE INTO ${TABLE_NAME_FIELD_TYPES} (id, name) VALUES (${fieldType.id}, '${fieldType.name}');`,
).join('\n')}
COMMIT;
`;
// Nodes
let nodeCount: number = 0;
let nodeInitializationString: string = `
BEGIN TRANSACTION;
`;
/**Actors */
const DEFAULT_ACTOR_ID = nodeCount++;
nodeInitializationString += `
INSERT OR IGNORE INTO ${TABLE_NAME_NODES} 
(id, parent, type, name, isFolder) VALUES 
(${DEFAULT_ACTOR_ID}, NULL, ${NODE_TYPE_ID_ACTOR}, 'Player', false);
`;
/**Auto-Completes */
/**Conversations */
/**Default Fields */
let defaultFieldIndex = 0;
const DEFAULT_FIELD_NODE_IDS = new Array<number>(NODE_TYPES.length);
nodeInitializationString += NODE_TYPES.map((nodeType: NodeTypeRow) => {
    const nodeId = nodeCount++;
    DEFAULT_FIELD_NODE_IDS[defaultFieldIndex++] = nodeId;
    return `INSERT OR IGNORE INTO ${TABLE_NAME_NODES} 
        (id, parent, type, name, isFolder) VALUES 
        (${nodeId}, NULL, ${NODE_TYPE_ID_DEFAULT_FIELD}, '${nodeType.name}', false);`;
}).join('\n');
/**Dialogues */
/**Locales */
const DEFAULT_LOCALE_ID = nodeCount++;
nodeInitializationString += `
INSERT OR IGNORE INTO ${TABLE_NAME_NODES} 
(id, parent, type, name, isFolder) VALUES 
(${DEFAULT_LOCALE_ID}, NULL, ${NODE_TYPE_ID_LOCALE}, 'en_US', false);
`;
/**Localization Tables */
const ACTOR_LOCALIZATION_TABLE_ID = nodeCount++;
nodeInitializationString += `
INSERT OR IGNORE INTO ${TABLE_NAME_NODES} 
(id, parent, type, name, isFolder) VALUES 
(${ACTOR_LOCALIZATION_TABLE_ID}, NULL, ${NODE_TYPE_ID_LOCALIZATION_TABLE}, 'Actors', false);
`;
/**Localizations */
const ACTOR_NAME_LOCALIZATION_ID = nodeCount++;
nodeInitializationString += `
INSERT OR IGNORE INTO ${TABLE_NAME_NODES} 
(id, parent, type, name, isFolder) VALUES 
(${ACTOR_NAME_LOCALIZATION_ID}, ${ACTOR_LOCALIZATION_TABLE_ID}, ${NODE_TYPE_ID_LOCALIZATION}, 'Player Name', false);
`;
/**Programming Language */
nodeInitializationString += `
INSERT OR IGNORE INTO ${TABLE_NAME_NODES} 
(id, parent, type, name, isFolder) VALUES 
(${nodeCount++}, NULL, ${NODE_TYPE_ID_PROGRAMMING_LANGUAGE}, 'C#', false);
`;
/**Routines */
const EMPTY_ROUTINE_ID = nodeCount++;
nodeInitializationString += `
INSERT OR IGNORE INTO ${TABLE_NAME_NODES} 
(id, parent, type, name, isFolder) VALUES 
(${EMPTY_ROUTINE_ID}, NULL, ${NODE_TYPE_ID_ROUTINE}, 'No Op', false);
`;
nodeInitializationString += `
COMMIT;
`;
const INITIALIZE_NODES = nodeInitializationString;

// Fields
let fieldCount: number = 0;
let fieldsInitializationString: string = `
BEGIN TRANSACTION;
`;
/**Actor */
fieldsInitializationString += `
INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, name, isDefault, reference) VALUES 
(${fieldCount++}, ${DEFAULT_ACTOR_ID}, ${FIELD_TYPE_ID_LOCALIZED_TEXT}, 'Actor Name', true, ${ACTOR_NAME_LOCALIZATION_ID});

INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, name, isDefault, color) VALUES 
(${fieldCount++}, ${DEFAULT_ACTOR_ID}, ${FIELD_TYPE_ID_COLOR}, 'Node Color', true, 'C33535');
`;
/**Auto-Complete */
/**Conversation */
/**Default Fields - Actor */
fieldsInitializationString += `
INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, name, isDefault) VALUES 
(${fieldCount++}, ${
    DEFAULT_FIELD_NODE_IDS[NODE_TYPE_ID_ACTOR]
}, ${FIELD_TYPE_ID_LOCALIZED_TEXT}, 'Actor Name', true);

INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, name, isDefault) VALUES 
(${fieldCount++}, ${
    DEFAULT_FIELD_NODE_IDS[NODE_TYPE_ID_ACTOR]
}, ${FIELD_TYPE_ID_COLOR}, 'Node Color', true);
`;
/**Default Fields - Auto-Complete */
fieldsInitializationString += `
INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, name, isDefault) VALUES 
(${fieldCount++}, ${
    DEFAULT_FIELD_NODE_IDS[NODE_TYPE_ID_AUTO_COMPLETE]
}, ${FIELD_TYPE_ID_TEXT}, 'Label', true);

INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, name, isDefault) VALUES 
(${fieldCount++}, ${
    DEFAULT_FIELD_NODE_IDS[NODE_TYPE_ID_AUTO_COMPLETE]
}, ${FIELD_TYPE_ID_TEXT}, 'Kind', true);

INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, name, isDefault) VALUES 
(${fieldCount++}, ${
    DEFAULT_FIELD_NODE_IDS[NODE_TYPE_ID_AUTO_COMPLETE]
}, ${FIELD_TYPE_ID_TEXT}, 'Text to Insert', true);
`;
/**Default Fields - Conversation */
/**Default Fields - Default Fields*/
/**Default Fields - Dialogue*/
fieldsInitializationString += `
INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, name, isDefault) VALUES 
(${fieldCount++}, ${
    DEFAULT_FIELD_NODE_IDS[NODE_TYPE_ID_DIALOGUE]
}, ${FIELD_TYPE_ID_ACTOR}, 'Actor', true);

INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, name, isDefault) VALUES 
(${fieldCount++}, ${
    DEFAULT_FIELD_NODE_IDS[NODE_TYPE_ID_DIALOGUE]
}, ${FIELD_TYPE_ID_LOCALIZED_TEXT}, 'UI Text', true);

INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, name, isDefault) VALUES 
(${fieldCount++}, ${
    DEFAULT_FIELD_NODE_IDS[NODE_TYPE_ID_DIALOGUE]
}, ${FIELD_TYPE_ID_LOCALIZED_TEXT}, 'Voice Text', true);

INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, name, isDefault) VALUES 
(${fieldCount++}, ${
    DEFAULT_FIELD_NODE_IDS[NODE_TYPE_ID_DIALOGUE]
}, ${FIELD_TYPE_ID_CODE}, 'Condition', true);

INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, name, isDefault) VALUES 
(${fieldCount++}, ${
    DEFAULT_FIELD_NODE_IDS[NODE_TYPE_ID_DIALOGUE]
}, ${FIELD_TYPE_ID_CODE}, 'Code', true);
`;
/**Default Fields - Locale*/
fieldsInitializationString += `
INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, name, isDefault) VALUES 
(${fieldCount++}, ${
    DEFAULT_FIELD_NODE_IDS[NODE_TYPE_ID_LOCALE]
}, ${FIELD_TYPE_ID_BOOLEAN}, 'Is Primary', true);
`;
/**Default Fields - Localization Table*/
/**Default Fields - Localization*/
fieldsInitializationString += `
INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, isDefault, reference) VALUES 
(${fieldCount++}, ${
    DEFAULT_FIELD_NODE_IDS[NODE_TYPE_ID_LOCALIZATION]
}, ${FIELD_TYPE_ID_TEXT}, true, ${DEFAULT_LOCALE_ID});
`; // localization nodes use "reference" instead of "name" to identify the column
/**Default Fields - Programming Language*/
/**Default Fields - Routine*/
fieldsInitializationString += `
INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, name, isDefault) VALUES 
(${fieldCount++}, ${
    DEFAULT_FIELD_NODE_IDS[NODE_TYPE_ID_ROUTINE]
}, ${FIELD_TYPE_ID_BOOLEAN}, 'Is Default', true);

INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, name, isDefault) VALUES 
(${fieldCount++}, ${
    DEFAULT_FIELD_NODE_IDS[NODE_TYPE_ID_ROUTINE]
}, ${FIELD_TYPE_ID_CODE}, 'Code', true);
`;
/**Dialogue */
/**Locale */
fieldsInitializationString += `
INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, name, isDefault, bool) VALUES 
(${fieldCount++}, ${DEFAULT_LOCALE_ID}, ${FIELD_TYPE_ID_BOOLEAN}, 'Is Primary', true, true);
`;
/**Localization Table */
/**Localization */
fieldsInitializationString += `
INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, isDefault, reference, text) VALUES 
(${fieldCount++}, ${ACTOR_NAME_LOCALIZATION_ID}, ${FIELD_TYPE_ID_TEXT}, true, ${DEFAULT_LOCALE_ID}, 'Player');
`;
/**Programming Language*/
/**Routine */
fieldsInitializationString += `
INSERT OR IGNORE INTO ${TABLE_NAME_FIELDS} 
(id, parent, type, name, isDefault, code) VALUES 
(${fieldCount++}, ${EMPTY_ROUTINE_ID}, ${FIELD_TYPE_ID_CODE}, 'Code', true, '');
`;
fieldsInitializationString += `
COMMIT;
`;
const INITIALIZE_FIELDS = fieldsInitializationString;
export const INITIALIZE_TABLE_QUERIES = [
    INITIALIZE_NODE_TYPES,
    INITIALIZE_FIELD_TYPES,
    INITIALIZE_NODES,
    INITIALIZE_FIELDS,
];
