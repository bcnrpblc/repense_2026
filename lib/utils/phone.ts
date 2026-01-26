/**
 * Phone number formatting utilities
 */

/**
 * Removes all non-numeric characters from phone
 */
export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Formats phone as (##) #####-####
 */
export function formatPhone(phone: string): string {
  const cleaned = cleanPhone(phone);
  if (cleaned.length !== 11) return phone;
  
  return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

/**
 * Formats phone number for WhatsApp link with country code
 * - 10-11 digits (Brazilian without country code) -> prepends 55
 * - 12-15 digits (with country code) -> uses as-is
 * - Returns null if invalid
 */
export function formatPhoneForWhatsApp(telefone: string): string | null {
  const digitsOnly = telefone.replace(/\D/g, '');
  
  // 10-11 digits (Brazilian without country code) -> prepend 55
  if (/^\d{10,11}$/.test(digitsOnly)) {
    return `55${digitsOnly}`;
  }
  
  // 12-15 digits (with country code) -> use as-is
  if (digitsOnly.length >= 12 && digitsOnly.length <= 15) {
    return digitsOnly;
  }
  
  return null; // Invalid
}
