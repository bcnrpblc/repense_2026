/**
 * Converts Brazilian date format (dd-MM-yyyy or dd/MM/yyyy) to ISO date string
 * @param dateStr - Date in format dd-MM-yyyy or dd/MM/yyyy (e.g., "25-12-1990", "25/12/1990")
 * @returns ISO date string or null if invalid
 */
export function brazilianDateToISO(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) {
    return null;
  }

  // Normalize slashes to hyphens so dd/MM/yyyy is accepted
  const normalized = dateStr.trim().replace(/\//g, '-');
  const cleaned = normalized.replace(/[^\d-]/g, '');
  
  // Match dd-MM-yyyy format
  const match = cleaned.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  // Validate date values
  if (monthNum < 1 || monthNum > 12) {
    return null;
  }
  if (dayNum < 1 || dayNum > 31) {
    return null;
  }
  if (yearNum < 1900 || yearNum > 2100) {
    return null;
  }

  // Create date object and validate (handles invalid dates like 31-02-1990)
  const date = new Date(yearNum, monthNum - 1, dayNum);
  if (
    date.getFullYear() !== yearNum ||
    date.getMonth() !== monthNum - 1 ||
    date.getDate() !== dayNum
  ) {
    return null;
  }

  return date.toISOString().split('T')[0];
}

/**
 * Converts ISO date string to Brazilian format (dd-MM-yyyy)
 * Parses ISO as local date to avoid timezone shifts (e.g. "1990-12-25" → 25/12/1990 in BR).
 * @param isoDate - ISO date string (e.g., "1990-12-25") or Date object
 * @returns Date in format dd-MM-yyyy or null if invalid
 */
export function isoDateToBrazilian(isoDate: string | Date | null | undefined): string | null {
  if (!isoDate) {
    return null;
  }

  let date: Date;

  if (isoDate instanceof Date) {
    date = isoDate;
  } else {
    const part = String(isoDate).split('T')[0];
    const match = part.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, y, m, d] = match.map(Number);
      date = new Date(y, m - 1, d);
      if (isNaN(date.getTime())) return null;
    } else {
      date = new Date(isoDate);
      if (isNaN(date.getTime())) return null;
    }
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

/**
 * Validates Brazilian date format (dd-MM-yyyy)
 * @param dateStr - Date string to validate
 * @returns true if valid, false otherwise
 */
export function validateBrazilianDate(dateStr: string): boolean {
  return brazilianDateToISO(dateStr) !== null;
}
