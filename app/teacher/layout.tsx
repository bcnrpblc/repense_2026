'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { TeacherNav } from '@/app/components/TeacherNav';
import { usePathname } from 'next/navigation';

// ============================================================================
// LOADING SPINNER COMPONENT
// ============================================================================

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Carregando...</p>
      </div>
    </div>
  );
}

// ============================================================================
// PROTECTED TEACHER CONTENT COMPONENT
// ============================================================================

function ProtectedTeacherContent({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, token } = useAuth({
    requiredRole: 'teacher',
    redirectOnFail: true,
    loginPath: '/teacher/login',
  });

  const [teacherName, setTeacherName] = useState<string>('Facilitador');
  const [ehAdmin, setEhAdmin] = useState<boolean>(false);

  useEffect(() => {
    async function fetchTeacherInfo() {
      if (!token) return;
      try {
        const response = await fetch('/api/auth/teacher/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.teacher?.nome) {
            setTeacherName(data.teacher.nome);
          }
          if (data.teacher?.eh_admin) {
            setEhAdmin(data.teacher.eh_admin);
          }
        }
      } catch (error) {
        console.error('Error fetching teacher info:', error);
      }
    }
    fetchTeacherInfo();
  }, [token]);

  // Also get eh_admin from the user object (decoded from JWT)
  useEffect(() => {
    if (user?.hasAdminAccess) {
      setEhAdmin(true);
    }
  }, [user]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherNav userName={teacherName} userEmail={user.email} onLogout={logout} ehAdmin={ehAdmin} />
      <main className="lg:ml-64 min-h-screen">
        <div className="lg:hidden h-16" />
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

// ============================================================================
// TEACHER LAYOUT COMPONENT
// ============================================================================

/**
 * Teacher layout component with authentication protection
 * 
 * This layout wraps all teacher pages and provides:
 * - Authentication check on mount (except for login page)
 * - Redirect to login if not authenticated
 * - Loading spinner while checking auth
 * - Navigation sidebar with teacher name
 * - Logout functionality
 */
export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/teacher/login';

  // Login page should not have auth protection - render directly
  if (isLoginPage) {
    return <>{children}</>;
  }

  // For all other pages, use protected content wrapper
  return <ProtectedTeacherContent>{children}</ProtectedTeacherContent>;
}
