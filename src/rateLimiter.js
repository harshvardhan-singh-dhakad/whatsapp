// ============================================================
//  AdsVerse — Rate Limiter  |  rateLimiter.js
// ============================================================

// ── CONFIG ────────────────────────────────────────────────────────────────────

const CONFIG = {
    MAX_MESSAGES      : 8,                  // Max messages allowed per window
    WINDOW_MS         : 60  * 1000,         // Sliding window: 1 minute
    PENALTY_MS        : 10  * 60 * 1000,    // Cooldown after hitting limit: 10 minutes
    STALE_CLEANUP_MS  : 30  * 60 * 1000,    // Remove inactive entries after 30 min
    CLEANUP_INTERVAL_MS: 15 * 60 * 1000,    // Run cleanup every 15 minutes
};

// ── STATE ─────────────────────────────────────────────────────────────────────

/**
 * @type {Record<string, { timestamps: number[], penalizedUntil: number | null, violations: number }>}
 */
let store = {};

// ── AUTO CLEANUP ──────────────────────────────────────────────────────────────
// Removes entries for numbers that have been inactive for STALE_CLEANUP_MS.
// Prevents unbounded memory growth over time.

setInterval(() => {
    const now   = Date.now();
    let removed = 0;

    for (const phone of Object.keys(store)) {
        const entry      = store[phone];
        const lastSeen   = entry.timestamps.length > 0 ? Math.max(...entry.timestamps) : 0;
        const isPenalized = entry.penalizedUntil && entry.penalizedUntil > now;

        if (!isPenalized && now - lastSeen > CONFIG.STALE_CLEANUP_MS) {
            delete store[phone];
            removed++;
        }
    }

    if (removed > 0) {
        console.info(`[RateLimiter] Cleanup: removed ${removed} stale entries. Active: ${Object.keys(store).length}`);
    }
}, CONFIG.CLEANUP_INTERVAL_MS);

// ── CORE FUNCTION ─────────────────────────────────────────────────────────────

/**
 * Check if a phone number is rate limited.
 *
 * @param {string} phone
 * @returns {{
 *   limited    : boolean,
 *   retryAfterMs: number,   // ms until they can send again (0 if not limited)
 *   retryAfterSec: number,  // human-readable seconds
 *   reason     : string,    // 'ok' | 'rate_limit' | 'penalty'
 *   remaining  : number,    // messages left in current window
 * }}
 */
export function isRateLimited(phone) {
    const now = Date.now();

    // Initialise entry for new number
    if (!store[phone]) {
        store[phone] = { timestamps: [], penalizedUntil: null, violations: 0 };
    }

    const entry = store[phone];

    // ── 1. Check penalty cooldown (spammer is still in timeout) ──────────────
    if (entry.penalizedUntil && now < entry.penalizedUntil) {
        const retryAfterMs = entry.penalizedUntil - now;
        return {
            limited      : true,
            retryAfterMs,
            retryAfterSec: Math.ceil(retryAfterMs / 1000),
            reason       : 'penalty',
            remaining    : 0,
        };
    }

    // ── 2. Sliding window — drop timestamps outside the window ───────────────
    entry.timestamps = entry.timestamps.filter(t => now - t < CONFIG.WINDOW_MS);

    // ── 3. Check if window limit exceeded ────────────────────────────────────
    if (entry.timestamps.length >= CONFIG.MAX_MESSAGES) {
        // Apply penalty cooldown for repeat offenders
        entry.violations++;
        entry.penalizedUntil = now + CONFIG.PENALTY_MS;

        const retryAfterMs = CONFIG.PENALTY_MS;
        return {
            limited      : true,
            retryAfterMs,
            retryAfterSec: Math.ceil(retryAfterMs / 1000),
            reason       : 'rate_limit',
            remaining    : 0,
        };
    }

    // ── 4. Allow — record this timestamp ─────────────────────────────────────
    entry.timestamps.push(now);

    const remaining = CONFIG.MAX_MESSAGES - entry.timestamps.length;
    return {
        limited      : false,
        retryAfterMs : 0,
        retryAfterSec: 0,
        reason       : 'ok',
        remaining,
    };
}

// ── UTILITIES ─────────────────────────────────────────────────────────────────

/**
 * Reset rate limit for one phone number, or clear all if no phone given.
 * @param {string} [phone]
 */
export function resetLimiter(phone) {
    if (phone) {
        delete store[phone];
    } else {
        store = {};
    }
}

/**
 * Live stats — useful for monitoring / admin dashboard.
 * @returns {{ total: number, penalized: number, topOffenders: Array }}
 */
export function getLimiterStats() {
    const now      = Date.now();
    const entries  = Object.entries(store);
    const penalized = entries.filter(([, e]) => e.penalizedUntil && e.penalizedUntil > now);

    const topOffenders = entries
        .filter(([, e]) => e.violations > 0)
        .sort(([, a], [, b]) => b.violations - a.violations)
        .slice(0, 5)
        .map(([phone, e]) => ({ phone, violations: e.violations }));

    return {
        total       : entries.length,
        penalized   : penalized.length,
        topOffenders,
    };
}

export default { isRateLimited, resetLimiter, getLimiterStats };
