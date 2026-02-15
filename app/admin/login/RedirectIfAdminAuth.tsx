'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/hooks/useAuth';
import { decodeToken, isTokenExpired } from '@/lib/auth-client';

/**
 * Wrapper for admin login page. If the user already has a valid token that
 * grants admin access (admin token or teacher with eh_admin), redirect to
 * /admin/dashboard so they are not shown the login form.
 */
export function RedirectIfAdminAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checkDone, setCheckDone] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token || isTokenExpired(token)) {
      setCheckDone(true);
      return;
    }

    const decoded = decodeToken(token);
    if (!decoded) {
      setCheckDone(true);
      return;
    }

    const hasAdminAccess =
      ('adminId' in decoded && !!decoded.adminId) ||
      ('teacherId' in decoded && !!decoded.teacherId && !!(decoded as { eh_admin?: boolean }).eh_admin);

    if (hasAdminAccess) {
      router.replace('/admin/dashboard');
      return;
    }

    setCheckDone(true);
  }, [router]);

  // Brief loading state to avoid flashing login form before redirect
  if (!checkDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
