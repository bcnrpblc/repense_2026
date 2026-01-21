'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getAuthToken } from '@/lib/hooks/useAuth';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

interface TeacherNavProps {
  /** Teacher name to display */
  userName: string;
  /** Teacher email to display */
  userEmail: string;
  /** Logout handler function */
  onLogout: () => void;
}

interface ActiveSession {
  id: string;
  class: {
    id: string;
    grupo_repense: string;
    horario: string | null;
  };
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

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
    />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35A1.724 1.724 0 004.455 7.75c-.94-1.543.826-3.31 2.37-2.37.996.607 2.296.07 2.573-1.063z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
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

const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
    />
  </svg>
);

// ============================================================================
// NAVIGATION ITEMS
// ============================================================================

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/teacher/dashboard', icon: <DashboardIcon /> },
  { label: 'Minhas Turmas', href: '/teacher/classes', icon: <ClassesIcon /> },
  { label: 'Alterar Senha', href: '/teacher/change-password', icon: <SettingsIcon /> },
];

// ============================================================================
// TEACHER NAVIGATION COMPONENT
// ============================================================================

/**
 * Teacher navigation sidebar component
 * 
 * Features:
 * - Responsive design with hamburger menu on mobile
 * - Active route highlighting
 * - Active session indicator
 * - User name/email display
 * - Logout button
 */
export function TeacherNav({ userName, userEmail, onLogout }: TeacherNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  // Check for active session
  useEffect(() => {
    async function checkActiveSession() {
      const token = getAuthToken();
      if (!token) return;

      try {
        const response = await fetch('/api/teacher/sessions/active', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setActiveSession(data.session);
        }
      } catch (error) {
        console.error('Error checking active session:', error);
      }
    }

    checkActiveSession();

    // Poll for active session every 30 seconds
    const interval = setInterval(checkActiveSession, 30000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Check if a nav item is currently active
   */
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

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
          <div className="flex items-center gap-2">
            {/* Active Session Indicator (Mobile) */}
            {activeSession && (
              <Link
                href={`/teacher/classes/${activeSession.class.id}/session`}
                className="p-2 bg-green-100 text-green-600 rounded-lg"
                title="Sessão ativa"
              >
                <PlayIcon />
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
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
            <span className="ml-3 font-semibold text-gray-900">Líder Repense</span>
          </div>

          {/* Mobile spacer */}
          <div className="lg:hidden h-16" />

          {/* Active Session Banner */}
          {activeSession && (
            <Link
              href={`/teacher/classes/${activeSession.class.id}/session`}
              className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="flex items-center gap-2 text-green-700">
                <PlayIcon />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Sessão Ativa</p>
                  <p className="text-xs text-green-600 truncate">
                    {activeSession.class.grupo_repense} - {activeSession.class.horario || 'Sem horário'}
                  </p>
                </div>
              </div>
            </Link>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navItems.map(renderNavLink)}
          </nav>

          {/* User Section */}
          <div className="border-t border-gray-200 p-4">
            {/* User Info */}
            <div className="flex items-center px-4 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium text-foreground truncate">
                  {userName}
                </p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
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
