-- Module schemas for WanderPall.
-- This migration is idempotent and safe to run repeatedly.

CREATE SCHEMA IF NOT EXISTS account;
CREATE SCHEMA IF NOT EXISTS travel_assistance;
CREATE SCHEMA IF NOT EXISTS travel_buddies;
CREATE SCHEMA IF NOT EXISTS maps;
CREATE SCHEMA IF NOT EXISTS journal;
CREATE SCHEMA IF NOT EXISTS shared;

COMMENT ON SCHEMA account IS 'Module 1: account, site settings, and authentication.';
COMMENT ON SCHEMA travel_assistance IS 'Module 2: guides, email, calendar, translator, costs, and private notes.';
COMMENT ON SCHEMA travel_buddies IS 'Module 3: travel buddies groups.';
COMMENT ON SCHEMA maps IS 'Module 4: trip map editing.';
COMMENT ON SCHEMA journal IS 'Module 5: travel journals.';
COMMENT ON SCHEMA shared IS 'Cross-cutting database objects used by more than one module.';
