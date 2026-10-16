const SQL_003 = `
CREATE TABLE IF NOT EXISTS body_measurements (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  date         TEXT NOT NULL,
  weight       REAL,
  chest        REAL,
  waist        REAL,
  hips         REAL,
  arm_left     REAL,
  arm_right    REAL,
  thigh_left   REAL,
  thigh_right  REAL,
  neck         REAL,
  notes        TEXT
);
`;

export const migration003 = {
  version: 3,
  name: '003_body_measurements',
  sql: SQL_003,
} as const;
