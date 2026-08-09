PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  client_name TEXT,
  status TEXT NOT NULL DEFAULT '提案中' CHECK (status IN ('提案中', '进行中', '已完成', '已搁置')),
  region TEXT,
  start_date TEXT,
  end_date TEXT,
  notes TEXT,
  color TEXT NOT NULL DEFAULT '#ff735f',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  company TEXT,
  role TEXT,
  phone TEXT,
  email TEXT,
  region TEXT,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_contacts (
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  relationship TEXT,
  PRIMARY KEY (project_id, contact_id)
);

CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0 CHECK (all_day IN (0, 1)),
  color TEXT NOT NULL DEFAULT '#ff735f',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS schedule_projects (
  schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (schedule_id, project_id)
);

CREATE TABLE IF NOT EXISTS schedule_contacts (
  schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (schedule_id, contact_id)
);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  cos_etag TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_region ON projects(region);
CREATE INDEX IF NOT EXISTS idx_contacts_region ON contacts(region);
CREATE INDEX IF NOT EXISTS idx_schedules_starts_at ON schedules(starts_at);
CREATE INDEX IF NOT EXISTS idx_attachments_schedule_id ON attachments(schedule_id);
