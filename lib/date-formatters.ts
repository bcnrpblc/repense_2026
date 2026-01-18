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
 * Formats a date to Portuguese day name
 * @param date - Date object or ISO date string
 * @returns Portuguese day name (e.g., "Segunda-feira")
 */
export function formatDayOfWeek(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
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
  const dateObj = typeof date === 'string' ? new Date(date) : date;
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
    const dateObj = typeof dataInicio === 'string' ? new Date(dataInicio) : dataInicio;
    
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
