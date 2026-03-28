import * as SQLite from 'expo-sqlite';
import { Document } from '../types';

const DB_NAME = 'doclear_offline.db';

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initTables();
  }
  return db;
}

async function initTables(): Promise<void> {
  if (!db) return;

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cached_documents (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      idempotency_key TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL,
      attempts INTEGER DEFAULT 0,
      last_error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_outbox_created ON outbox(created_at);
  `);
}

// --- Document cache ---

export async function cacheDocument(doc: Document): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO cached_documents (id, data, cached_at) VALUES (?, ?, ?)`,
    [doc.id, JSON.stringify(doc), Date.now()]
  );
}

export async function cacheDocuments(docs: Document[]): Promise<void> {
  const database = await getDb();
  for (const doc of docs) {
    await database.runAsync(
      `INSERT OR REPLACE INTO cached_documents (id, data, cached_at) VALUES (?, ?, ?)`,
      [doc.id, JSON.stringify(doc), Date.now()]
    );
  }
}

export async function getCachedDocument(id: string): Promise<Document | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ data: string }>(
    `SELECT data FROM cached_documents WHERE id = ?`,
    [id]
  );
  return row ? JSON.parse(row.data) : null;
}

export async function getCachedDocuments(): Promise<Document[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ data: string }>(
    `SELECT data FROM cached_documents ORDER BY cached_at DESC`
  );
  return rows.map((row) => JSON.parse(row.data));
}

export async function clearDocumentCache(): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM cached_documents`);
}

// --- Outbox (offline sync) ---

export interface OutboxAction {
  id: number;
  action: string;
  payload: string;
  idempotency_key: string;
  created_at: number;
  attempts: number;
  last_error: string | null;
}

export async function addToOutbox(
  action: string,
  payload: Record<string, unknown>
): Promise<void> {
  const database = await getDb();
  const idempotencyKey = `${action}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await database.runAsync(
    `INSERT INTO outbox (action, payload, idempotency_key, created_at) VALUES (?, ?, ?, ?)`,
    [action, JSON.stringify(payload), idempotencyKey, Date.now()]
  );
}

export async function getPendingOutboxActions(): Promise<OutboxAction[]> {
  const database = await getDb();
  return database.getAllAsync<OutboxAction>(
    `SELECT * FROM outbox WHERE attempts < 5 ORDER BY created_at ASC`
  );
}

export async function markOutboxActionDone(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM outbox WHERE id = ?`, [id]);
}

export async function markOutboxActionFailed(id: number, error: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
    [error, id]
  );
}

export async function getOutboxCount(): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM outbox WHERE attempts < 5`
  );
  return row?.count ?? 0;
}
