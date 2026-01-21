'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label text displayed above the input */
  label?: string;
  /** Error message displayed below the input */
  error?: string;
  /** Helper text displayed below the input (when no error) */
  helperText?: string;
  /** Whether the input should take full width */
  fullWidth?: boolean;
}

// ============================================================================
// INPUT COMPONENT
// ============================================================================

/**
 * Reusable input component with label and error handling
 * 
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   type="email"
 *   placeholder="Digite seu email"
 *   error={errors.email}
 *   {...register('email')}
 * />
 * 
 * <Input
 *   label="Senha"
 *   type="password"
 *   helperText="Mínimo 6 caracteres"
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      label,
      error,
      helperText,
      fullWidth = true,
      className = '',
      id,
      ...props
    },
    ref
  ) {
    // Generate a unique ID if not provided
    const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;

    const inputClassName = `
      block px-4 py-2.5
      bg-white
      border rounded-lg
      text-gray-900
      placeholder-gray-400
      transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-0
      ${error
        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
      }
      ${fullWidth ? 'w-full' : ''}
      ${props.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
      ${className}
    `.replace(/\s+/g, ' ').trim();

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
          </label>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={inputClassName}
          {...props}
        />
        
        {error && (
          <p className="mt-1.5 text-sm text-red-600">
            {error}
          </p>
        )}
        
        {!error && helperText && (
          <p className="mt-1.5 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
