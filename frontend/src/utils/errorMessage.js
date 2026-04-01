/**
 * Normalizes thrown values from API calls (and other catch blocks) into a user-facing string.
 * Handles non-Error throws, empty messages, and unknown shapes without exposing raw objects.
 */
export function getErrorMessage(err, fallback = 'Something went wrong') {
  if (err == null) return fallback;
  if (typeof err === 'string') {
    const t = err.trim();
    return t || fallback;
  }
  if (typeof err === 'object' && typeof err.message === 'string') {
    const t = err.message.trim();
    if (t) return t;
  }
  return fallback;
}
