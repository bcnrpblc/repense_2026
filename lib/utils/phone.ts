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
