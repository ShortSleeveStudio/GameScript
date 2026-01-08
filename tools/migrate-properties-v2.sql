-- Migration Script: Properties System V2
--
-- This script migrates an existing GameScript database to support:
-- 1. Property Values (predefined values for property templates)
-- 2. Conversation Properties (properties on conversations, not just nodes)
-- 3. Reference support for node properties (is_reference, reference_value)
--
-- Run this script ONCE on existing databases.
-- New databases created after this update will have these tables/columns automatically.
--
-- Usage:
--   SQLite:     sqlite3 your_database.db < migrate-properties-v2.sql
--   PostgreSQL: psql -d your_database -f migrate-properties-v2.sql

-- ============================================================================
-- Step 1: Create property_values table
-- ============================================================================
-- Stores predefined values for property templates.
-- When a template has predefined values, users can select from them OR enter custom values.

CREATE TABLE IF NOT EXISTS property_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES property_templates(id) ON DELETE CASCADE,
    value_string TEXT,
    value_integer INTEGER,
    value_decimal REAL,
    value_boolean INTEGER  -- SQLite stores booleans as 0/1
);

-- ============================================================================
-- Step 2: Create conversation_properties table
-- ============================================================================
-- Mirrors node_properties structure but for conversations.

CREATE TABLE IF NOT EXISTS conversation_properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    template INTEGER NOT NULL REFERENCES property_templates(id) ON DELETE CASCADE,
    is_reference INTEGER NOT NULL DEFAULT 0,
    reference_value INTEGER REFERENCES property_values(id) ON DELETE SET NULL,
    value_string TEXT,
    value_integer INTEGER,
    value_decimal REAL,
    value_boolean INTEGER
);

-- ============================================================================
-- Step 3: Add new columns to node_properties table
-- ============================================================================
-- These columns enable node properties to reference predefined values.

-- Add is_reference column (0 = custom value, 1 = references a predefined value)
ALTER TABLE node_properties ADD COLUMN is_reference INTEGER NOT NULL DEFAULT 0;

-- Add reference_value column (FK to property_values.id when is_reference = 1)
ALTER TABLE node_properties ADD COLUMN reference_value INTEGER REFERENCES property_values(id) ON DELETE SET NULL;

-- ============================================================================
-- Done!
-- ============================================================================
-- After running this migration:
-- - Existing node properties will have is_reference = 0 (custom values)
-- - You can now create predefined values for property templates
-- - You can now add properties to conversations (if you create conversation templates)
--
-- Note: nodes.type column (TEXT) supports these values:
-- - 'root': Root/start node (one per conversation)
-- - 'dialogue': Dialogue node with speech text
-- - 'logic': Logic node (actions/conditions only, no speech)
