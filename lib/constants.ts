/**
 * Available cities for PG Repense registration
 * This constant defines the cities where classes are available.
 * To add a new city, add it here and ensure classes are created with that city value.
 */
export const AVAILABLE_CITIES = [
  { value: 'Indaiatuba', label: 'Indaiatuba' },
  { value: 'Itu', label: 'Itu' },
] as const;

/**
 * Minimum number of absences (faltas) for a student to be flagged as "at-risk" on the teacher dashboard.
 * Students with this many or more absences will appear in the "Alunos com X ou Mais Faltas" card.
 */
export const AT_RISK_ABSENCE_THRESHOLD = 3;

/**
 * Available roles (função) for teachers/facilitators
 * "Líder" = Leader, "Co-líder" = Co-leader
 */
export const FUNCAO_OPCOES = ['Líder', 'Co-líder'] as const;
export type Funcao = typeof FUNCAO_OPCOES[number];

export type City = typeof AVAILABLE_CITIES[number]['value'];

/**
 * Get city label by value
 */
export function getCityLabel(city: string | null | undefined): string {
  if (!city) return '';
  const cityOption = AVAILABLE_CITIES.find((c) => c.value === city);
  return cityOption?.label || city;
}

/**
 * Check if a city value is valid
 */
export function isValidCity(city: string | null | undefined): boolean {
  if (!city) return false;
  return AVAILABLE_CITIES.some((c) => c.value === city);
}
