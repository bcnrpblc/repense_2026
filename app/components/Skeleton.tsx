'use client';

import { ReactNode } from 'react';

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

interface SkeletonProps {
  /** Width of the skeleton (can be Tailwind class or custom value) */
  width?: string;
  /** Height of the skeleton (can be Tailwind class or custom value) */
  height?: string;
  /** Whether the skeleton is circular */
  circle?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Base Skeleton component for loading states
 * 
 * @example
 * ```tsx
 * <Skeleton width="w-48" height="h-4" />
 * <Skeleton circle width="w-10" height="h-10" />
 * ```
 */
export function Skeleton({
  width = 'w-full',
  height = 'h-4',
  circle = false,
  className = '',
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-muted';
  const shapeClasses = circle ? 'rounded-full' : 'rounded';

  return (
    <div
      className={`${baseClasses} ${shapeClasses} ${width} ${height} ${className}`}
    />
  );
}

// ============================================================================
// SKELETON VARIANTS
// ============================================================================

/**
 * Text skeleton - simulates a line of text
 */
export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {[...Array(lines)].map((_, i) => (
        <Skeleton
          key={i}
          height="h-4"
          width={i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
}

/**
 * Avatar skeleton - circular placeholder for avatars
 */
export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return <Skeleton circle width={sizeClasses[size].split(' ')[0]} height={sizeClasses[size].split(' ')[1]} />;
}

/**
 * Button skeleton - placeholder for buttons
 */
export function SkeletonButton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-16 h-8',
    md: 'w-24 h-10',
    lg: 'w-32 h-12',
  };

  return <Skeleton width={sizeClasses[size].split(' ')[0]} height={sizeClasses[size].split(' ')[1]} className="rounded-lg" />;
}

/**
 * Card skeleton - placeholder for card components
 */
export function SkeletonCard({ children }: { children?: ReactNode }) {
  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      {children || (
        <div className="space-y-4">
          <Skeleton height="h-6" width="w-1/2" />
          <Skeleton height="h-4" width="w-full" />
          <Skeleton height="h-4" width="w-3/4" />
        </div>
      )}
    </div>
  );
}

/**
 * Table row skeleton - placeholder for table rows
 */
export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {[...Array(columns)].map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton height="h-4" width={i === 0 ? 'w-32' : 'w-24'} />
        </td>
      ))}
    </tr>
  );
}

/**
 * Table skeleton - complete table placeholder
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  showHeader = true,
}: {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
      {showHeader && (
        <div className="bg-muted border-b border-border px-4 py-3">
          <div className="flex gap-4">
            {[...Array(columns)].map((_, i) => (
              <Skeleton key={i} height="h-4" width="w-24" />
            ))}
          </div>
        </div>
      )}
      <table className="w-full">
        <tbody className="divide-y divide-border">
          {[...Array(rows)].map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Stats card skeleton - placeholder for stat cards
 */
export function SkeletonStatCard() {
  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <Skeleton height="h-8" width="w-16" className="mb-2" />
      <Skeleton height="h-4" width="w-24" />
    </div>
  );
}

/**
 * Stats grid skeleton - multiple stat cards
 */
export function SkeletonStatsGrid({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${Math.min(count, 4)} gap-4`}>
      {[...Array(count)].map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

/**
 * List item skeleton - placeholder for list items
 */
export function SkeletonListItem({ showAvatar = true }: { showAvatar?: boolean }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100">
      {showAvatar && <SkeletonAvatar />}
      <div className="flex-1 space-y-2">
        <Skeleton height="h-4" width="w-48" />
        <Skeleton height="h-3" width="w-32" />
      </div>
      <Skeleton height="h-6" width="w-16" />
    </div>
  );
}

/**
 * List skeleton - multiple list items
 */
export function SkeletonList({ items = 5, showAvatar = true }: { items?: number; showAvatar?: boolean }) {
  return (
    <div className="space-y-4">
      {[...Array(items)].map((_, i) => (
        <SkeletonListItem key={i} showAvatar={showAvatar} />
      ))}
    </div>
  );
}

/**
 * Form skeleton - placeholder for forms
 */
export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(fields)].map((_, i) => (
        <div key={i}>
          <Skeleton height="h-4" width="w-24" className="mb-2" />
          <Skeleton height="h-10" width="w-full" className="rounded-lg" />
        </div>
      ))}
      <div className="flex justify-end gap-3 pt-4">
        <SkeletonButton size="md" />
        <SkeletonButton size="md" />
      </div>
    </div>
  );
}

/**
 * Page skeleton - full page loading state
 */
export function SkeletonPage() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <Skeleton height="h-8" width="w-48" className="mb-2" />
        <Skeleton height="h-4" width="w-64" />
      </div>

      {/* Stats */}
      <SkeletonStatsGrid count={4} />

      {/* Content */}
      <div className="mt-6">
        <SkeletonTable rows={5} columns={5} />
      </div>
    </div>
  );
}
