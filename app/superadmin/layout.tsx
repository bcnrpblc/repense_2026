'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { SuperadminNav } from '@/app/components/SuperadminNav';
import { ToastProvider } from '@/app/components/ToastProvider';
import { usePathname } from 'next/navigation';

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

function ProtectedSuperadminContent({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth({
    requiredRole: 'admin',
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
      <SuperadminNav userEmail={user.email} onLogout={logout} />
      <main className="lg:ml-64 min-h-screen">
        <div className="lg:hidden h-16" />
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return <ProtectedSuperadminContent>{children}</ProtectedSuperadminContent>;
}

