/** Indian mobile: fixed +91, 10-digit national number (starts with 6–9). */

export const IN_PHONE_PREFIX = '+91';
export const IN_MOBILE_DIGITS = 10;

/** Digits only for the national part (max 10), for controlled input. */
export function sanitizeIndiaMobileInput(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, IN_MOBILE_DIGITS);
}

/** From stored +91… or legacy 10-digit, get 10 digits for the input field. */
export function nationalDigitsFromStored(stored) {
  if (stored == null || stored === '') return '';
  const d = String(stored).replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('91')) return d.slice(2, 12);
  if (d.length === 10) return d;
  return sanitizeIndiaMobileInput(stored);
}

/** API payload: empty field → empty string; otherwise +91 + 10 digits. */
export function toIndiaE164(nationalDigits) {
  const d = sanitizeIndiaMobileInput(nationalDigits);
  if (!d) return '';
  return `${IN_PHONE_PREFIX}${d}`;
}

export function isValidIndiaMobileDigits(digits) {
  const d = sanitizeIndiaMobileInput(digits);
  if (d.length !== IN_MOBILE_DIGITS) return false;
  return /^[6-9]\d{9}$/.test(d);
}
