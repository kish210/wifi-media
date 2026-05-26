import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { config } from "../config";

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(config.db.path);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(config.db.path);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      username    TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      email       TEXT UNIQUE,
      password    TEXT NOT NULL,
      avatar      TEXT,
      role        TEXT NOT NULL DEFAULT 'viewer',  -- admin | viewer
      pin         TEXT,
      language    TEXT DEFAULT 'en',
      theme       TEXT DEFAULT 'dark',
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      last_seen   INTEGER
    );

    -- Sessions (refresh tokens)
    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token       TEXT UNIQUE NOT NULL,
      device      TEXT,
      ip          TEXT,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      expires_at  INTEGER NOT NULL
    );

    -- Watchlist
    CREATE TABLE IF NOT EXISTS watchlist (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      media_id    TEXT NOT NULL,
      media_type  TEXT NOT NULL,  -- movie | series | music
      added_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(user_id, media_id)
    );

    -- Watch history
    CREATE TABLE IF NOT EXISTS watch_history (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      media_id    TEXT NOT NULL,
      media_type  TEXT NOT NULL,
      progress    INTEGER DEFAULT 0,   -- seconds watched
      duration    INTEGER DEFAULT 0,
      watched_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- Media metadata cache
    CREATE TABLE IF NOT EXISTS media_cache (
      id          TEXT PRIMARY KEY,
      path        TEXT UNIQUE NOT NULL,
      type        TEXT NOT NULL,  -- movie | series | music | video
      title       TEXT NOT NULL,
      year        INTEGER,
      description TEXT,
      poster      TEXT,
      backdrop    TEXT,
      duration    INTEGER,
      size        INTEGER,
      genres      TEXT,  -- JSON array
      rating      REAL,
      scanned_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- Watch parties (rooms)
    CREATE TABLE IF NOT EXISTS rooms (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      host_id     TEXT NOT NULL REFERENCES users(id),
      media_id    TEXT,
      media_type  TEXT,
      state       TEXT DEFAULT 'waiting',  -- waiting | playing | paused | ended
      position    INTEGER DEFAULT 0,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      ended_at    INTEGER
    );

    -- Room members
    CREATE TABLE IF NOT EXISTS room_members (
      room_id     TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at   INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (room_id, user_id)
    );

    -- Chat messages
    CREATE TABLE IF NOT EXISTS chat_messages (
      id          TEXT PRIMARY KEY,
      room_id     TEXT REFERENCES rooms(id) ON DELETE CASCADE,
      user_id     TEXT NOT NULL REFERENCES users(id),
      content     TEXT NOT NULL,
      type        TEXT DEFAULT 'text',  -- text | system | emoji
      sent_at     INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- Channel favorites
    CREATE TABLE IF NOT EXISTS channel_favorites (
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel_id  TEXT NOT NULL,
      added_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (user_id, channel_id)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
    CREATE INDEX IF NOT EXISTS idx_media_cache_type ON media_cache(type);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `);

  // Seed default admin if no users
  const count = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  if (count.c === 0) {
    const bcrypt = require("bcryptjs");
    const { v4: uuidv4 } = require("uuid");
    const hash = bcrypt.hashSync("admin", 10);
    db.prepare(`
      INSERT INTO users (id, username, display_name, password, role)
      VALUES (?, 'admin', 'Administrator', ?, 'admin')
    `).run(uuidv4(), hash);
    db.prepare(`
      INSERT INTO users (id, username, display_name, password, role)
      VALUES (?, 'guest', 'Guest', ?, 'viewer')
    `).run(uuidv4(), bcrypt.hashSync("guest", 10));
  }
}
