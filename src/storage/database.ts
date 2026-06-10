import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export function defaultDbPath(): string {
  return process.env.FUBAR_DB_PATH ?? join(homedir(), ".fubar", "fubar.db");
}

export function openDatabase(path = defaultDbPath()): Database {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { create: true });
  db.run("PRAGMA foreign_keys = ON");
  db.run("PRAGMA journal_mode = WAL");
  migrate(db);
  return db;
}

function migrate(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS homes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      home_id TEXT NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      floor TEXT,
      occupancy_state TEXT NOT NULL DEFAULT 'unknown',
      created_at TEXT NOT NULL,
      UNIQUE(home_id, name)
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      online INTEGER NOT NULL DEFAULT 1,
      power_state TEXT NOT NULL DEFAULT 'off',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sensors (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      last_value TEXT,
      last_triggered_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS automations (
      id TEXT PRIMARY KEY,
      home_id TEXT NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      trigger_ref TEXT,
      action_type TEXT NOT NULL,
      action_ref TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_run_at TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      home_id TEXT REFERENCES homes(id) ON DELETE SET NULL,
      room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
  `);
}
