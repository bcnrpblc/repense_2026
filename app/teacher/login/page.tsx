import { LoginForm } from '@/app/components/LoginForm';
import { Metadata } from 'next';

// ============================================================================
// METADATA
// ============================================================================

export const metadata: Metadata = {
  title: 'PG Repense - Login do Facilitador do PG Repense',
  description: 'Login de Facilitadores do sistema PG Repense',
};

// ============================================================================
// TEACHER LOGIN PAGE
// ============================================================================

/**
 * Teacher login page component
 * 
 * Login page for teachers to access their dashboard.
 * Uses the shared LoginForm component with teacher-specific configuration.
 * 
 * Route: /teacher/login
 */
export default function TeacherLoginPage() {
  return (
    <LoginForm
      title="Login do Facilitador do PG Repense"
      role="teacher"
      subtitle="Acesse a área do facilitador"
      redirectPath="/teacher/dashboard"
    />
  );
}
