const SQL_006 = `
CREATE TABLE photos_new (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_type TEXT NOT NULL CHECK(owner_type IN ('diary','session','body')),
  owner_id   INTEGER NOT NULL,
  file_path  TEXT NOT NULL,
  thumb_path TEXT,
  width      INTEGER,
  height     INTEGER,
  created_at TEXT NOT NULL
);
INSERT INTO photos_new (id, owner_type, owner_id, file_path, thumb_path, width, height, created_at)
  SELECT id, owner_type, owner_id, file_path, thumb_path, width, height, created_at FROM photos;
DROP TABLE photos;
ALTER TABLE photos_new RENAME TO photos;
CREATE INDEX IF NOT EXISTS idx_photos_owner ON photos(owner_type, owner_id);
`;

/** Fotos de progreso en medidas corporales (owner_type 'body') */
export const migration006 = {
  version: 6,
  name: '006_body_photos',
  sql: SQL_006,
} as const;
