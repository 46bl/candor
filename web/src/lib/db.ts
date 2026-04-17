// db.ts — SQLite database via Bun's built-in sqlite driver
// No user PII is ever stored. Only account hashes, tiers, and daily counters.
// The account number itself (the user's secret) is never stored in plaintext.

import { Database } from 'bun:sqlite'
import { join } from 'path'

const DB_PATH = process.env.DB_PATH ?? join(import.meta.dir, '..', '..', '..', 'candor.db')

let _db: Database | null = null

export function getDb(): Database {
  if (_db) return _db
  _db = new Database(DB_PATH, { create: true })
  _db.exec('PRAGMA journal_mode = WAL;')  // Better concurrency
  _db.exec('PRAGMA foreign_keys = ON;')
  migrate(_db)
  return _db
}

// ── Schema ─────────────────────────────────────────────────────────────────────

function migrate(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      account_hash    TEXT    UNIQUE NOT NULL,  -- SHA-256 of the raw account number. Never stored plain.
      tier            TEXT    NOT NULL DEFAULT 'free',  -- 'free' | 'pro' | 'lifetime'
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      expires_at      TEXT    DEFAULT NULL,     -- NULL = no expiry, ISO date = pro subscription end
      daily_checks    INTEGER NOT NULL DEFAULT 0,
      last_check_date TEXT    DEFAULT NULL      -- YYYY-MM-DD, used to reset daily counter
    );
  `)

  // Optional: track Stripe customer IDs for subscription management
  // We never store the account number itself, only its hash → Stripe mapping
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      account_hash    TEXT    UNIQUE NOT NULL REFERENCES accounts(account_hash),
      stripe_customer TEXT    DEFAULT NULL,
      stripe_sub_id   TEXT    DEFAULT NULL,
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

// ── Account queries ────────────────────────────────────────────────────────────

export interface AccountRow {
  id: number
  account_hash: string
  tier: 'free' | 'pro' | 'lifetime'
  created_at: string
  expires_at: string | null
  daily_checks: number
  last_check_date: string | null
}

export function createAccount(hash: string): AccountRow {
  const db = getDb()
  db.run('INSERT INTO accounts (account_hash) VALUES (?)', [hash])
  return getAccountByHash(hash)!
}

export function getAccountByHash(hash: string): AccountRow | null {
  const db = getDb()
  return db
    .query<AccountRow, string>('SELECT * FROM accounts WHERE account_hash = ?')
    .get(hash) ?? null
}

export function isRateLimited(account: AccountRow, dailyLimit: number): boolean {
  const today = todayString()
  if (account.last_check_date !== today) return false
  return account.daily_checks >= dailyLimit
}

export function incrementDailyChecks(hash: string): void {
  const db = getDb()
  const today = todayString()
  db.run(
    `UPDATE accounts
     SET daily_checks    = CASE WHEN last_check_date = ? THEN daily_checks + 1 ELSE 1 END,
         last_check_date = ?
     WHERE account_hash  = ?`,
    [today, today, hash]
  )
}

export function upgradeAccount(
  hash: string,
  tier: 'pro' | 'lifetime',
  expiresAt: string | null
): void {
  const db = getDb()
  db.run(
    'UPDATE accounts SET tier = ?, expires_at = ? WHERE account_hash = ?',
    [tier, expiresAt, hash]
  )
}

export function deactivateExpiredPro(): number {
  // Called periodically to downgrade expired pro subscriptions
  const db = getDb()
  const result = db.run(
    `UPDATE accounts
     SET tier = 'free', expires_at = NULL
     WHERE tier = 'pro'
       AND expires_at IS NOT NULL
       AND expires_at < datetime('now')`
  )
  return result.changes
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}
