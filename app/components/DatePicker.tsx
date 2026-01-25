'use client';

import { useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { ptBR } from 'react-day-picker/locale';
import { isoDateToBrazilian } from '@/lib/utils/date';
import 'react-day-picker/style.css';

// ============================================================================
// TYPES
// ============================================================================

export interface DatePickerProps {
  /** Value as ISO date string (YYYY-MM-DD) or empty */
  value: string;
  /** Called with ISO date string when user selects a date */
  onChange: (iso: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  /** Minimum selectable date */
  minDate?: Date;
  /** Additional class for the trigger button */
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function parseISO(iso: string): Date | undefined {
  if (!iso || !iso.trim()) return undefined;
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return undefined;
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? undefined : date;
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ============================================================================
// DATE PICKER COMPONENT
// ============================================================================

/**
 * Intuitive calendar date picker with BR format (dd-mm-yyyy) display.
 * Stores and emits ISO (YYYY-MM-DD) for APIs.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecione a data',
  id,
  disabled = false,
  minDate,
  className = '',
}: DatePickerProps) {
  const selected = useMemo(() => parseISO(value), [value]);
  const display = selected ? isoDateToBrazilian(value) : '';

  return (
    <Popover className="relative">
      <PopoverButton
        id={id}
        disabled={disabled}
        type="button"
        className={`flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2 text-left text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60 ${className}`}
      >
        <span className={display ? 'text-gray-900' : 'text-gray-500'}>
          {display || placeholder}
        </span>
        <CalendarIcon />
      </PopoverButton>
      <PopoverPanel
        anchor="bottom start"
        className="z-50 mt-1 rounded-xl border border-gray-200 bg-white p-3 shadow-lg [--anchor-gap:6px]"
      >
        {({ close }) => (
          <DayPicker
            mode="single"
            locale={ptBR}
            selected={selected}
            onSelect={(date) => {
              if (!date) return;
              onChange(toISO(date));
              close();
            }}
            disabled={minDate ? { before: minDate } : undefined}
            defaultMonth={selected ?? minDate ?? new Date()}
          />
        )}
      </PopoverPanel>
    </Popover>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="h-5 w-5 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}
