'use client';

import { HTMLAttributes, forwardRef, ReactNode } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Whether to show hover effect */
  hoverable?: boolean;
  /** Optional header content */
  header?: ReactNode;
  /** Optional footer content */
  footer?: ReactNode;
}

// ============================================================================
// STYLE CONSTANTS
// ============================================================================

const paddingStyles: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

// ============================================================================
// CARD COMPONENT
// ============================================================================

/**
 * Reusable card component for content containers
 * 
 * @example
 * ```tsx
 * <Card>
 *   <h2>Card Title</h2>
 *   <p>Card content goes here</p>
 * </Card>
 * 
 * <Card hoverable onClick={handleClick}>
 *   <p>Clickable card</p>
 * </Card>
 * 
 * <Card 
 *   header={<CardHeader title="Stats" />}
 *   footer={<Button>View All</Button>}
 * >
 *   <p>Content</p>
 * </Card>
 * ```
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  function Card(
    {
      children,
      padding = 'md',
      hoverable = false,
      header,
      footer,
      className = '',
      ...props
    },
    ref
  ) {
    const cardClassName = `
      bg-card
      text-card-foreground
      rounded-lg
      border
      shadow-sm
      ${hoverable ? 'hover:shadow-md transition-shadow duration-200 cursor-pointer' : ''}
      ${className}
    `.replace(/\s+/g, ' ').trim();

    return (
      <div ref={ref} className={cardClassName} {...props}>
        {header && (
          <div className="px-6 py-4 border-b border-gray-100">
            {header}
          </div>
        )}
        
        <div className={paddingStyles[padding]}>
          {children}
        </div>
        
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

// ============================================================================
// CARD HEADER COMPONENT
// ============================================================================

export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

/**
 * Card header component with title and optional action
 */
export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  change?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

/**
 * Stat card component for displaying metrics
 * 
 * @example
 * ```tsx
 * <StatCard
 *   title="Total Students"
 *   value={150}
 *   icon={<UsersIcon />}
 *   change={{ value: 12, isPositive: true }}
 * />
 * ```
 */
export function StatCard({ title, value, icon, change, className = '' }: StatCardProps) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
          {change && (
            <p className={`mt-1 text-sm ${change.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {change.isPositive ? '+' : '-'}{Math.abs(change.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// NAVIGATION CARD COMPONENT
// ============================================================================

export interface NavCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Navigation card for dashboard quick links
 * 
 * @example
 * ```tsx
 * <NavCard
 *   title="Manage Classes"
 *   description="View and edit classes"
 *   icon={<AcademicCapIcon />}
 *   href="/admin/classes"
 * />
 * ```
 */
export function NavCard({ 
  title, 
  description, 
  icon, 
  href, 
  onClick,
  disabled = false,
  className = '' 
}: NavCardProps) {
  const cardContent = (
    <div className={`
      flex items-center space-x-4
      ${disabled ? 'opacity-50' : ''}
    `}>
      {icon && (
        <div className="flex-shrink-0 p-3 bg-primary/10 rounded-lg text-primary">
          {icon}
        </div>
      )}
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );

  if (href && !disabled) {
    return (
      <a href={href} className="block">
        <Card hoverable className={className}>
          {cardContent}
        </Card>
      </a>
    );
  }

  return (
    <Card 
      hoverable={!disabled} 
      onClick={disabled ? undefined : onClick}
      className={`${className} ${disabled ? 'cursor-not-allowed' : ''}`}
    >
      {cardContent}
      {disabled && (
        <p className="mt-2 text-xs text-gray-400 italic">Em breve</p>
      )}
    </Card>
  );
}
