CREATE TABLE IF NOT EXISTS customer_manager_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customerId INTEGER NOT NULL,
  context TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL,
  createdByUserId INTEGER,
  createdByUsername TEXT,
  createdByRole TEXT,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
  updatedAt TEXT,
  isDeleted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customer_manager_notes_customer_created
  ON customer_manager_notes(customerId, createdAt DESC);

CREATE INDEX IF NOT EXISTS idx_customer_manager_notes_active
  ON customer_manager_notes(isDeleted, createdAt DESC);
