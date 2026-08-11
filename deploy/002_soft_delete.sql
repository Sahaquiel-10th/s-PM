ALTER TABLE projects ADD COLUMN deleted_at TEXT;
ALTER TABLE contacts ADD COLUMN deleted_at TEXT;
ALTER TABLE schedules ADD COLUMN deleted_at TEXT;
ALTER TABLE attachments ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON contacts(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedules_deleted_at ON schedules(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attachments_deleted_at ON attachments(deleted_at) WHERE deleted_at IS NOT NULL;

PRAGMA optimize;
