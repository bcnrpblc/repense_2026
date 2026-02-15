import { LoginForm } from '@/app/components/LoginForm';
import { RedirectIfAdminAuth } from '@/app/admin/login/RedirectIfAdminAuth';
import { Metadata } from 'next';

// ============================================================================
// METADATA
// ============================================================================

export const metadata: Metadata = {
  title: 'PG Repense - Admin Login',
  description: 'Login administrativo do sistema PG Repense',
};

// ============================================================================
// ADMIN LOGIN PAGE
// ============================================================================

/**
 * Admin login page component
 *
 * If the user already has admin access (admin or teacher with eh_admin),
 * redirects to /admin/dashboard. Otherwise shows the login form.
 *
 * Route: /admin/login
 */
export default function AdminLoginPage() {
  return (
    <RedirectIfAdminAuth>
      <LoginForm
        title="Admin Login"
        role="admin"
        subtitle="Acesse o painel administrativo"
        redirectPath="/admin/dashboard"
      />
    </RedirectIfAdminAuth>
  );
}
