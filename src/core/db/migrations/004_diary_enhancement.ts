const SQL_004 = `
ALTER TABLE diary_entries ADD COLUMN sleep_quality INTEGER CHECK(sleep_quality BETWEEN 1 AND 5);
ALTER TABLE diary_entries ADD COLUMN weather_icon TEXT;
ALTER TABLE diary_entries ADD COLUMN is_closed INTEGER NOT NULL DEFAULT 0;
`;

export const migration004 = {
  version: 4,
  name: '004_diary_enhancement',
  sql: SQL_004,
} as const;
