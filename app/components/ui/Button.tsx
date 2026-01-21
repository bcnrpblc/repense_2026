'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Whether the button should take full width */
  fullWidth?: boolean;
}

// ============================================================================
// STYLE CONSTANTS
// ============================================================================

const baseStyles = `
  inline-flex items-center justify-center
  font-medium rounded-lg
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
`;

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-primary text-primary-foreground
    hover:bg-primary/90
    focus:ring-primary
  `,
  secondary: `
    bg-secondary text-secondary-foreground
    hover:bg-secondary/80
    focus:ring-ring
  `,
  danger: `
    bg-destructive text-destructive-foreground
    hover:bg-destructive/90
    focus:ring-destructive
  `,
  ghost: `
    bg-transparent text-foreground
    hover:bg-accent hover:text-accent-foreground
    focus:ring-ring
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

// ============================================================================
// LOADING SPINNER COMPONENT
// ============================================================================

function LoadingSpinner({ size }: { size: ButtonSize }) {
  const spinnerSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  
  return (
    <svg
      className={`animate-spin -ml-1 mr-2 ${spinnerSize}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================================
// BUTTON COMPONENT
// ============================================================================

/**
 * Reusable button component with multiple variants and sizes
 * 
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>
 *   Click me
 * </Button>
 * 
 * <Button variant="danger" loading={isDeleting}>
 *   Delete
 * </Button>
 * 
 * <Button variant="secondary" size="sm" disabled>
 *   Disabled
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      className = '',
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) {
    const combinedClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `.replace(/\s+/g, ' ').trim();

    return (
      <button
        ref={ref}
        type={type}
        className={combinedClassName}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <LoadingSpinner size={size} />}
        {children}
      </button>
    );
  }
);
