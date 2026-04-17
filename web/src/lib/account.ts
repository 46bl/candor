// account.ts — account number generation and validation
//
// Account number format: XXXX-XXXX-XXXX-XXXX (16 random digits)
// Displayed: 1284-7391-5620-4839
//
// The raw number is shown to the user exactly once, on creation.
// The server stores only SHA-256(digits) — we cannot reverse it.
// If a user loses their number, it cannot be recovered.
//
// This is intentional and mirrors the Mullvad VPN model.

import { createAccount, getAccountByHash, isRateLimited, incrementDailyChecks } from './db.js'
import type { AccountRow } from './db.js'

// ── Generation ─────────────────────────────────────────────────────────────────

export function generateAccountNumber(): string {
  // 16 cryptographically random decimal digits
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)

  // Convert to decimal digits (takes first 16 decimal digits of the number)
  let digits = ''
  for (const byte of bytes) {
    digits += byte.toString().padStart(3, '0')
  }
  digits = digits.replace(/\D/g, '').slice(0, 16).padEnd(16, '0')

  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12, 16)}`
}

// ── Hashing ────────────────────────────────────────────────────────────────────

export async function hashAccountNumber(accountNumber: string): Promise<string> {
  const clean = normalizeAccountNumber(accountNumber)
  if (!clean) throw new Error('Invalid account number format')

  const encoded = new TextEncoder().encode(clean)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Validation ─────────────────────────────────────────────────────────────────

export function normalizeAccountNumber(input: string): string | null {
  // Accept with or without dashes, with or without spaces
  const digits = input.replace(/[-\s]/g, '')
  if (!/^\d{16}$/.test(digits)) return null
  return digits
}

export function isValidAccountNumberFormat(input: string): boolean {
  return normalizeAccountNumber(input) !== null
}

// ── Account lifecycle ──────────────────────────────────────────────────────────

export interface NewAccount {
  accountNumber: string  // Shown to user ONCE — never stored server-side
  tier: 'free'
  createdAt: string
}

export async function createNewAccount(): Promise<NewAccount> {
  const accountNumber = generateAccountNumber()
  const hash = await hashAccountNumber(accountNumber)

  // Store only the hash — never the raw number
  createAccount(hash)

  return {
    accountNumber,
    tier: 'free',
    createdAt: new Date().toISOString(),
  }
}

// ── Tier resolution ────────────────────────────────────────────────────────────

export const DAILY_LIMITS = {
  free:     5,
  pro:      Infinity,
  lifetime: Infinity,
} as const

export type AuthResult =
  | { ok: true;  account: AccountRow }
  | { ok: false; status: number; error: string }

export async function resolveAccount(accountNumber: string | undefined): Promise<AuthResult> {
  if (!accountNumber || !isValidAccountNumberFormat(accountNumber)) {
    return {
      ok: false,
      status: 401,
      error: 'Valid account number required. Get one free at /account/new.',
    }
  }

  const hash = await hashAccountNumber(accountNumber)
  const account = getAccountByHash(hash)

  if (!account) {
    return {
      ok: false,
      status: 401,
      error: 'Account number not found.',
    }
  }

  // Check pro subscription expiry
  if (account.tier === 'pro' && account.expires_at) {
    if (new Date(account.expires_at) < new Date()) {
      return {
        ok: false,
        status: 402,
        error: 'Pro subscription expired. Renew at /upgrade.',
      }
    }
  }

  // Check daily rate limit for free tier
  const limit = DAILY_LIMITS[account.tier as keyof typeof DAILY_LIMITS] ?? 5
  if (isFinite(limit) && isRateLimited(account, limit)) {
    return {
      ok: false,
      status: 429,
      error: `Daily limit of ${limit} checks reached for free accounts. Upgrade at /upgrade.`,
    }
  }

  return { ok: true, account }
}

export async function recordCheck(accountNumber: string): Promise<void> {
  const hash = await hashAccountNumber(accountNumber)
  incrementDailyChecks(hash)
}

// Re-export for convenience
export { createAccount }
