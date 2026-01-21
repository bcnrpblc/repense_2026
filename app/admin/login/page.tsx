import { LoginForm } from '@/app/components/LoginForm';
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
 * Simple login page for administrators to access the admin dashboard.
 * Uses the shared LoginForm component with admin-specific configuration.
 * 
 * Route: /admin/login
 */
export default function AdminLoginPage() {
  return (
    <LoginForm
      title="Admin Login"
      role="admin"
      subtitle="Acesse o painel administrativo"
      redirectPath="/admin/dashboard"
    />
  );
}
