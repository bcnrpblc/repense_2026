'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

interface AdminNavProps {
  /** Admin email to display */
  userEmail: string;
  /** Logout handler function */
  onLogout: () => void;
}

// ============================================================================
// ICONS (using inline SVG for simplicity)
// ============================================================================

const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
    />
  </svg>
);

const ClassesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
    />
  </svg>
);

const TeachersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" 
    />
  </svg>
);

const ReportsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
    />
  </svg>
);

const StudentsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
    />
  </svg>
);

const EnrollmentsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" 
    />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
    />
  </svg>
);

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ============================================================================
// NAVIGATION ITEMS
// ============================================================================

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: <DashboardIcon /> },
  { label: 'Grupos', href: '/admin/classes', icon: <ClassesIcon /> },
  { label: 'Participantes', href: '/admin/students', icon: <StudentsIcon /> },
  { label: 'Facilitadores', href: '/admin/teachers', icon: <TeachersIcon /> },
];

// ============================================================================
// ADMIN NAVIGATION COMPONENT
// ============================================================================

/**
 * Admin navigation sidebar component
 * 
 * Features:
 * - Responsive design with hamburger menu on mobile
 * - Active route highlighting
 * - Disabled state for placeholder routes
 * - User email display
 * - Logout button
 * 
 * @example
 * ```tsx
 * <AdminNav
 *   userEmail="admin@example.com"
 *   onLogout={() => logout()}
 * />
 * ```
 */
export function AdminNav({ userEmail, onLogout }: AdminNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /**
   * Check if a nav item is currently active
   * Matches exact path or if current path starts with nav item path (for nested routes)
   */
  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  /**
   * Render a navigation link
   */
  const renderNavLink = (item: NavItem) => {
    const baseClasses = `
      flex items-center space-x-3 px-4 py-3 rounded-lg
      transition-colors duration-200
    `;

    const activeClasses = isActive(item.href)
      ? 'bg-primary/10 text-primary font-medium'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground';

    const disabledClasses = item.disabled
      ? 'opacity-50 cursor-not-allowed'
      : '';

    if (item.disabled) {
      return (
        <div
          key={item.href}
          className={`${baseClasses} ${activeClasses} ${disabledClasses}`}
          title="Em breve"
        >
          {item.icon}
          <span>{item.label}</span>
          <span className="ml-auto text-xs text-gray-400">(em breve)</span>
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`${baseClasses} ${activeClasses}`}
        onClick={() => setMobileMenuOpen(false)}
      >
        {item.icon}
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <img src="/logored.png" alt="PG Repense" className="h-8" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="hidden lg:flex items-center px-6 py-5 border-b border-gray-200">
            <img src="/logored.png" alt="PG Repense" className="h-10" />
            <span className="ml-3 font-semibold text-gray-900">Admin</span>
          </div>

          {/* Mobile spacer */}
          <div className="lg:hidden h-16" />

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navItems.map(renderNavLink)}
          </nav>

          {/* User Section */}
          <div className="border-t border-gray-200 p-4">
            {/* User Email */}
            <div className="flex items-center px-4 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium text-foreground truncate">
                  {userEmail}
                </p>
                <p className="text-xs text-muted-foreground">Administrador</p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="
                w-full flex items-center space-x-3 px-4 py-3 rounded-lg
                text-red-600 hover:bg-red-50
                transition-colors duration-200
              "
            >
              <LogoutIcon />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
