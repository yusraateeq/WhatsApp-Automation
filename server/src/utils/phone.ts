/**
 * Normalize phone number to consistent format
 * Removes all non-numeric characters and ensures country code
 */
export function normalizePhone(phone: string): string {
  // Remove all non-numeric characters
  let normalized = phone.replace(/[^0-9]/g, '');

  // Remove leading zeros
  while (normalized.startsWith('0')) {
    normalized = normalized.substring(1);
  }

  // Ensure country code for Pakistan (92)
  if (normalized.length === 10) {
    normalized = '92' + normalized;
  }

  return normalized;
}

/**
 * Format phone number for display
 */
export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone);

  // Pakistan format: +92 300 1234567
  if (normalized.length === 12 && normalized.startsWith('92')) {
    const code = normalized.substring(0, 2);
    const carrier = normalized.substring(2, 5);
    const number = normalized.substring(5);
    return `+${code} ${carrier} ${number}`;
  }

  return `+${normalized}`;
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);

  // Minimum 10 digits (local), maximum 15 digits (international)
  return normalized.length >= 10 && normalized.length <= 15;
}
