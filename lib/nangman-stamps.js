// Nangman Postcard stamp ledger. Free stamps are monthly; purchased stamps
// never expire. No public purchase-credit endpoint exists in this release.
// D1 is the only authority for spending and granting credits.
import { LIMITS, TTL_MS, sha256Hex } from "./nangman-postcard.js";

export const MONTHLY_FREE_STAMPS = 20;
export const STAMP_ACCOUNT_HEADER = "x-nangman-stamp-account";
const ACCOUNT_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function stampMonth(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 7);
}
export async function stampAccount(request) {
  const raw = request.headers.get(STAMP_ACCOUNT_HEADER);
  if (!raw) return null; // Legacy clients remain compatible.
  if (!ACCOUNT_RE.test(raw)) return { invalid: true };
  return { hash: await sha256Hex("nangman:stamps:v1:" + raw.toLowerCase()) };
}

// Defaults preserve the current launch experience, with launch-time switches
// to disable bonus credits later without changing or losing purchased credits.
export function stampPolicy(env = {}) {
  const n = Number(env.STAMPS_MONTHLY_FREE_COUNT);
  const monthlyAllowance =
    env.STAMPS_MONTHLY_FREE_COUNT === undefined || !Number.isInteger(n) || n < 0 || n > 1000
      ? MONTHLY_FREE_STAMPS : n;
  const b = Number(env.STAMPS_FREE_BONUS_COUNT);
  const bonusAllowance =
    env.STAMPS_FREE_BONUS_COUNT === undefined || !Number.isInteger(b) || b < 1 || b > 1000
      ? MONTHLY_FREE_STAMPS : b;
  return { monthlyAllowance, bonusAllowance, bonusEnabled: env.STAMPS_FREE_BONUS_ENABLED !== "false" };
}

export async function ensureStampSchema(DB) {
  await DB.prepare(
    "CREATE TABLE IF NOT EXISTS nangman_stamp_ledger (" +
    "entry_id TEXT PRIMARY KEY, account_hash TEXT NOT NULL, month TEXT NOT NULL, " +
    "kind TEXT NOT NULL, delta INTEGER NOT NULL, postcard_hash TEXT, created_at INTEGER NOT NULL, " +
    "pool TEXT NOT NULL DEFAULT 'free')"
  ).run();

  // Online additive migration. Existing rows are ALL launch-period free stamps.
  const columns = await DB.prepare("PRAGMA table_info(nangman_stamp_ledger)").all();
  if (!(columns?.results || []).some((c) => c.name === "pool")) {
    try {
      await DB.prepare("ALTER TABLE nangman_stamp_ledger ADD COLUMN pool TEXT NOT NULL DEFAULT 'free'").run();
    } catch (e) {
      // Two concurrent requests may both discover the old schema.
      if (!/duplicate column name/i.test(String(e))) throw e;
    }
  }
  await DB.prepare(
    "CREATE INDEX IF NOT EXISTS idx_nangman_stamps_balance ON nangman_stamp_ledger(account_hash, month)"
  ).run();
  await DB.prepare(
    "CREATE INDEX IF NOT EXISTS idx_nangman_stamps_pool ON nangman_stamp_ledger(account_hash, pool, month)"
  ).run();
}

export async function grantMonthly(DB, accountHash, now = Date.now(), env = {}) {
  const month = stampMonth(now);
  const { monthlyAllowance } = stampPolicy(env);
  await DB.prepare(
    "INSERT OR IGNORE INTO nangman_stamp_ledger " +
    "(entry_id, account_hash, month, kind, delta, created_at, pool) " +
    "VALUES (?1, ?2, ?3, 'free_monthly', ?4, ?5, 'free')"
  ).bind("monthly:" + accountHash + ":" + month, accountHash, month, monthlyAllowance, now).run();
}

export async function stampBalance(DB, accountHash, now = Date.now(), env = {}) {
  const month = stampMonth(now);
  const { monthlyAllowance, bonusEnabled } = stampPolicy(env);
  const r = await DB.prepare(
    "SELECT " +
    "COALESCE(SUM(CASE WHEN pool='free' AND month=?2 THEN delta ELSE 0 END),0) AS free_balance, " +
    "COALESCE(SUM(CASE WHEN pool='paid' THEN delta ELSE 0 END),0) AS paid_balance, " +
    "COALESCE(SUM(CASE WHEN kind='spend' AND month=?2 THEN 1 ELSE 0 END),0) AS sent, " +
    "COALESCE(SUM(CASE WHEN kind='free_bonus' AND month=?2 THEN delta ELSE 0 END),0) AS bonus " +
    "FROM nangman_stamp_ledger WHERE account_hash=?1"
  ).bind(accountHash, month).first();
  const freeBalance = Math.max(0, Number(r?.free_balance || 0));
  const paidBalance = Math.max(0, Number(r?.paid_balance || 0));
  return {
    month,
    freeBalance,
    paidBalance,
    balance: freeBalance + paidBalance, // backward-compatible iOS wallet view
    sent: Number(r?.sent || 0),
    bonus: Number(r?.bonus || 0),
    monthlyAllowance,
    price: 0, // No paid checkout is enabled in this phase.
    canGetBonus: bonusEnabled && freeBalance <= 0,
  };
}

/** Bonus affects only the free pool and can be disabled server-side. */
export async function grantBonus(DB, accountHash, now = Date.now(), env = {}) {
  const month = stampMonth(now);
  const policy = stampPolicy(env);
  if (!policy.bonusEnabled) return stampBalance(DB, accountHash, now, env);
  const id = "bonus:" + crypto.randomUUID();
  await DB.prepare(
    "INSERT INTO nangman_stamp_ledger " +
    "(entry_id, account_hash, month, kind, delta, created_at, pool) " +
    "SELECT ?1, ?2, ?3, 'free_bonus', ?4, ?5, 'free' " +
    "WHERE COALESCE((SELECT SUM(delta) FROM nangman_stamp_ledger " +
    "WHERE account_hash=?2 AND pool='free' AND month=?3),0) <= 0"
  ).bind(id, accountHash, month, policy.bonusAllowance, now).run();
  return stampBalance(DB, accountHash, now, env);
}

/**
 * A D1 batch runs transactionally. Check quota/cap and either of two balances
 * before reserving. Debit uses FREE first, then lifetime PAID, in that same
 * batch. This cannot cause paid stamps to expire at a monthly boundary.
 */
export async function reserveStamped(env, row, accountHash, now = Date.now()) {
  const month = stampMonth(now);
  const freeQ = "(SELECT COALESCE(SUM(delta),0) FROM nangman_stamp_ledger WHERE account_hash=?12 AND pool='free' AND month=?13)";
  const paidQ = "(SELECT COALESCE(SUM(delta),0) FROM nangman_stamp_ledger WHERE account_hash=?12 AND pool='paid')";
  const reservation = env.DB.prepare(
    "INSERT INTO nangman_postcards (id_hash, manage_hash, ip_hash, bytes, created_at, expires_at) " +
    "SELECT ?1, ?2, ?3, ?4, ?5, ?6 WHERE " +
    "(SELECT COUNT(*) FROM nangman_postcards WHERE ip_hash=?3 AND created_at>?7) < ?8 " +
    "AND (SELECT COALESCE(SUM(bytes),0) FROM nangman_postcards WHERE purged_at IS NULL AND expires_at>?5 AND created_at>?11) + ?4 <= ?9 " +
    "AND (SELECT COUNT(*) FROM nangman_postcards WHERE purged_at IS NULL AND expires_at>?5 AND created_at>?11) < ?10 " +
    "AND (" + freeQ + " > 0 OR " + paidQ + " > 0)"
  ).bind(
    row.idHash, row.manageHash, row.ipHash, row.bytes, now, row.expiresAt,
    now - 3600000, LIMITS.createsPerHour, LIMITS.totalBytes, LIMITS.activeCount,
    now - TTL_MS, accountHash, month
  );

  const freeDebit = "(SELECT COALESCE(SUM(delta),0) FROM nangman_stamp_ledger WHERE account_hash=?2 AND pool='free' AND month=?3)";
  const spend = env.DB.prepare(
    "INSERT INTO nangman_stamp_ledger " +
    "(entry_id, account_hash, month, kind, delta, postcard_hash, created_at, pool) " +
    "SELECT ?1, ?2, ?3, 'spend', -1, ?4, ?5, " +
    "CASE WHEN " + freeDebit + " > 0 THEN 'free' ELSE 'paid' END " +
    "FROM nangman_postcards WHERE id_hash=?4"
  ).bind("spend:" + row.idHash, accountHash, month, row.idHash, now);
  const [reserved, debited] = await env.DB.batch([reservation, spend]);
  return Number(reserved?.meta?.changes || 0) === 1 && Number(debited?.meta?.changes || 0) === 1;
}

/** Refund a failed upload to the ORIGINAL pool and month, at most once. */
export async function refundStamped(env, idHash, now = Date.now()) {
  const refund = env.DB.prepare(
    "INSERT OR IGNORE INTO nangman_stamp_ledger " +
    "(entry_id, account_hash, month, kind, delta, postcard_hash, created_at, pool) " +
    "SELECT ?1, account_hash, month, 'refund', 1, postcard_hash, ?2, pool " +
    "FROM nangman_stamp_ledger WHERE entry_id=?3 " +
    "AND EXISTS (SELECT 1 FROM nangman_postcards WHERE id_hash=?4)"
  ).bind("refund:" + idHash, now, "spend:" + idHash, idHash);
  const cleanup = env.DB.prepare("DELETE FROM nangman_postcards WHERE id_hash=?1").bind(idHash);
  await env.DB.batch([refund, cleanup]);
}
