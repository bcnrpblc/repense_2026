/**
 * Portuguese date and time formatting utilities for course display
 */

const weekDays = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

const months = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

/**
 * Parses a date as local date to avoid timezone conversion issues
 * When database stores "2026-02-24T00:00:00.000Z", this ensures we get Feb 24, not Feb 23
 * @param dateInput - Date object or ISO date string
 * @returns Date object parsed as local date
 */
function parseLocalDate(dateInput: Date | string): Date {
  if (typeof dateInput === 'string') {
    // Extract YYYY-MM-DD part before the 'T'
    const datePart = dateInput.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    // Create date in local timezone (month is 0-indexed)
    return new Date(year, month - 1, day);
  } else {
    // If it's already a Date object, extract components and recreate as local
    const year = dateInput.getUTCFullYear();
    const month = dateInput.getUTCMonth();
    const day = dateInput.getUTCDate();
    return new Date(year, month, day);
  }
}

/**
 * Formats a date to Portuguese day name
 * @param date - Date object or ISO date string
 * @returns Portuguese day name (e.g., "Segunda-feira")
 */
export function formatDayOfWeek(date: Date | string): string {
  const dateObj = parseLocalDate(date);
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  return weekDays[dateObj.getDay()];
}

/**
 * Formats a date to Portuguese month name
 * @param date - Date object or ISO date string
 * @returns Portuguese month name (e.g., "Janeiro")
 */
export function formatMonth(date: Date | string): string {
  const dateObj = parseLocalDate(date);
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  return months[dateObj.getMonth()];
}

/**
 * Formats time from "HH:mm" to Brazilian format
 * Removes ":00" from full hours (20:00 → 20h, but 16:30 → 16h30)
 * @param time - Time string in format "HH:mm" (e.g., "20:00" or "16:30")
 * @returns Formatted time string (e.g., "20h" or "16h30")
 */
export function formatTime(time: string | null | undefined): string {
  if (!time || !time.trim()) {
    return '';
  }

  // Remove any whitespace
  const cleaned = time.trim();

  // Match HH:mm format
  const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return cleaned; // Return original if format doesn't match
  }

  const [, hours, minutes] = match;
  const hoursNum = parseInt(hours, 10);
  const minutesNum = parseInt(minutes, 10);

  // Validate hours and minutes
  if (hoursNum < 0 || hoursNum > 23 || minutesNum < 0 || minutesNum > 59) {
    return cleaned; // Return original if invalid
  }

  // If minutes are 00, return "HHh", otherwise "HHhMM"
  if (minutesNum === 0) {
    return `${hoursNum}h`;
  } else {
    return `${hoursNum}h${minutes}`;
  }
}

/**
 * Formats course display text in Portuguese format
 * Format: "{{Modelo}} - {{day-of-week}} dia {{day}} de {{month}} às {{time}}"
 * Example: "Online - Terça-feira dia 20 de Janeiro às 20h"
 * Example: "Presencial - Domingo dia 18 de Janeiro às 16h30"
 * 
 * @param modelo - Course model (online/presencial) - will be capitalized
 * @param dataInicio - Course start date (Date or ISO string)
 * @param horario - Time string in format "HH:mm"
 * @returns Formatted course schedule string
 */
export function formatCourseSchedule(
  modelo: string,
  dataInicio: Date | string | null | undefined,
  horario: string | null | undefined
): string {
  // Capitalize modelo
  const modeloCapitalized = modelo.charAt(0).toUpperCase() + modelo.slice(1).toLowerCase();

  // If no date or time, return just modelo
  if (!dataInicio || !horario) {
    return modeloCapitalized;
  }

  try {
    const dateObj = parseLocalDate(dataInicio);
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return modeloCapitalized;
    }

    const dayOfWeek = formatDayOfWeek(dateObj);
    const day = dateObj.getDate();
    const month = formatMonth(dateObj);
    const time = formatTime(horario);

    // Build formatted string
    return `${modeloCapitalized} - ${dayOfWeek} dia ${day} de ${month} às ${time}`;
  } catch (error) {
    console.error('Error formatting course schedule:', error);
    return modeloCapitalized;
  }
}

/**
 * Formats a course date as a local date (fixes timezone conversion bug)
 * @param dateInput - Date object or ISO date string (e.g., "2026-02-24T00:00:00.000Z")
 * @returns Date object parsed as local date to avoid showing wrong day
 */
export function formatCourseDate(dateInput: Date | string): Date {
  return parseLocalDate(dateInput);
}

/**
 * Gets day name from date
 * @param date - Date object or ISO date string
 * @returns Day name (e.g., "Segunda-feira")
 */
export function getDayName(date: Date | string): string {
  return formatDayOfWeek(date);
}

/**
 * Gets month name from date
 * @param date - Date object or ISO date string
 * @returns Month name (e.g., "Janeiro")
 */
export function getMonthName(date: Date | string): string {
  return formatMonth(date);
}

/**
 * Formats a date as DD/MM (day and month only)
 * @param date - Date object or ISO date string
 * @returns Formatted string (e.g., "24/02") or empty string if invalid
 */
export function formatDateDDMM(date: Date | string | null | undefined): string {
  if (!date) return '';
  try {
    const dateObj = parseLocalDate(date);
    if (isNaN(dateObj.getTime())) return '';
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  } catch {
    return '';
  }
}

/**
 * Formats class display as "Modelo Weekday, DD/MM"
 * Example: "Online Terça-feira, 24/02" or "Presencial" if no date
 * @param modelo - Course model (online/presencial) - will be capitalized
 * @param dataInicio - Course start date (Date or ISO string)
 * @returns Formatted string
 */
export function formatClassDisplay(
  modelo: string,
  dataInicio: Date | string | null | undefined
): string {
  const modeloCapitalized =
    modelo.charAt(0).toUpperCase() + modelo.slice(1).toLowerCase();

  if (!dataInicio) return modeloCapitalized;

  try {
    const dateObj = parseLocalDate(dataInicio);
    if (isNaN(dateObj.getTime())) return modeloCapitalized;

    const dayOfWeek = formatDayOfWeek(dateObj);
    const ddmm = formatDateDDMM(dateObj);
    if (!dayOfWeek || !ddmm) return modeloCapitalized;

    return `${modeloCapitalized} ${dayOfWeek}, ${ddmm}`;
  } catch {
    return modeloCapitalized;
  }
}

/**
 * Alias for formatDayOfWeek - returns Portuguese weekday name
 * @param date - Date object or ISO date string
 * @returns Portuguese day name (e.g., "Segunda-feira")
 */
export function getWeekdayName(date: Date | string): string {
  return formatDayOfWeek(date);
}
