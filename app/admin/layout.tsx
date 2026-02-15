'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { AdminNav } from '@/app/components/AdminNav';
import { ToastProvider } from '@/app/components/ToastProvider';
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
// PROTECTED ADMIN CONTENT COMPONENT
// ============================================================================

function ProtectedAdminContent({ children }: { children: React.ReactNode }) {
  // Use requiredAdminAccess to allow both admins and teachers with eh_admin
  const { user, loading, logout } = useAuth({
    requiredAdminAccess: true,
    redirectOnFail: true,
    loginPath: '/admin/login',
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastProvider />
      <AdminNav userEmail={user.email} onLogout={logout} />
      <main className="lg:ml-64 min-h-screen">
        <div className="lg:hidden h-16" />
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

// ============================================================================
// ADMIN LAYOUT COMPONENT
// ============================================================================

/**
 * Admin layout component with authentication protection
 * 
 * This layout wraps all admin pages and provides:
 * - Authentication check on mount (except for login page)
 * - Redirect to login if not authenticated
 * - Loading spinner while checking auth
 * - Navigation sidebar
 * - Logout functionality
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  // Login page should not have auth protection - render directly
  if (isLoginPage) {
    return <>{children}</>;
  }

  // For all other pages, use protected content wrapper
  return <ProtectedAdminContent>{children}</ProtectedAdminContent>;
}
