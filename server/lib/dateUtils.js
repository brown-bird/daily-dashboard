/**
 * Timezone-aware date utilities.
 * Uses Intl API (built into Node) — no external dependencies.
 */

/**
 * Returns today's date as YYYY-MM-DD in the given timezone.
 * Falls back to UTC if tz is missing or invalid.
 */
function getLocalDate(tz) {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: tz });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Converts a UTC ISO timestamp to YYYY-MM-DD in the given timezone.
 * Falls back to UTC slice if tz is missing or invalid.
 */
function toLocalDate(isoString, tz) {
  try {
    return new Date(isoString).toLocaleDateString('en-CA', { timeZone: tz });
  } catch {
    return isoString.slice(0, 10);
  }
}

module.exports = { getLocalDate, toLocalDate };
