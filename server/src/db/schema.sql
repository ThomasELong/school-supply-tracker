-- ─────────────────────────────────────────────
-- Categories
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  name       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Items (inventory)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items (
  id               SERIAL  PRIMARY KEY,
  name             TEXT    NOT NULL,
  category_id      INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  quantity_min     INTEGER NOT NULL DEFAULT 0 CHECK (quantity_min >= 0),
  needs_order      BOOLEAN NOT NULL DEFAULT false,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_items_name_category
  ON items (name, category_id);

-- ─────────────────────────────────────────────
-- Grade Levels
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grade_levels (
  id         SERIAL  PRIMARY KEY,
  name       TEXT    NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Subjects
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id         SERIAL PRIMARY KEY,
  name       TEXT   NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Projects
-- A project links a grade level + subject to a specific date.
-- Multiple supply items can be attached via project_items.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id              SERIAL  PRIMARY KEY,
  grade_level_id  INTEGER NOT NULL REFERENCES grade_levels(id) ON DELETE RESTRICT,
  subject_id      INTEGER NOT NULL REFERENCES subjects(id)     ON DELETE RESTRICT,
  scheduled_date  TEXT    NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_date  ON projects (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_projects_grade ON projects (grade_level_id);

-- ─────────────────────────────────────────────
-- Project Items (junction: project ↔ inventory item)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_items (
  id              SERIAL  PRIMARY KEY,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_id         INTEGER NOT NULL REFERENCES items(id)    ON DELETE RESTRICT,
  quantity_needed INTEGER NOT NULL DEFAULT 1 CHECK (quantity_needed > 0),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_items_project ON project_items (project_id);
CREATE INDEX IF NOT EXISTS idx_project_items_item    ON project_items (item_id);

-- ─────────────────────────────────────────────
-- Migrations (idempotent column additions)
-- ─────────────────────────────────────────────

-- item_type: how the item's quantity is managed
--   consumable → auto-deducts from inventory after project date
--   reusable   → quantity never auto-changes (brushes, tools)
--   bulk       → user manages manually (paint, glue — partial-use containers)
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'consumable';

-- consumed: tracks whether a past project's consumables have been deducted
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS consumed BOOLEAN NOT NULL DEFAULT FALSE;
