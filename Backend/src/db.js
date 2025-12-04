const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DB_FILE = path.join(__dirname, '..', 'data.db');
const db = new DatabaseSync(DB_FILE);

function ensureColumn(table, column, sql) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = rows.some((r) => r.name === column);
  if (!exists) {
    db.exec(sql);
  }
}

function init() {
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS owners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      api_key TEXT UNIQUE NOT NULL,
      username TEXT,
      password_hash TEXT
    );
    CREATE TABLE IF NOT EXISTS cinemas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS films (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      language TEXT NOT NULL,
      subtitles TEXT,
      director TEXT NOT NULL,
      main_cast TEXT NOT NULL,
      min_age INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      cinema_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      image_url TEXT,
      FOREIGN KEY (cinema_id) REFERENCES cinemas(id),
      FOREIGN KEY (owner_id) REFERENCES owners(id)
    );
    CREATE TABLE IF NOT EXISTS seances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      film_id INTEGER NOT NULL,
      day_of_week TEXT NOT NULL,
      start_time TEXT NOT NULL,
      FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
    );
  `);
  ensureColumn('films', 'image_url', 'ALTER TABLE films ADD COLUMN image_url TEXT;');
  ensureColumn('owners', 'username', 'ALTER TABLE owners ADD COLUMN username TEXT;');
  ensureColumn('owners', 'password_hash', 'ALTER TABLE owners ADD COLUMN password_hash TEXT;');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_owners_username ON owners(username);');
}

module.exports = { db, init, DB_FILE };
