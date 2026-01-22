'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { storeAuthToken } from '@/lib/hooks/useAuth';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface LoginFormProps {
  /** Form title displayed at the top */
  title: string;
  /** User role - determines which API endpoint to call */
  role: 'admin' | 'teacher';
  /** Optional subtitle text */
  subtitle?: string;
  /** Path to redirect to after successful login */
  redirectPath: string;
}

// ============================================================================
// LOGIN FORM COMPONENT
// ============================================================================

/**
 * Reusable login form component for admin and teacher authentication
 * 
 * Features:
 * - Email and password validation
 * - Loading state during submission
 * - Error message display
 * - Automatic redirect on success
 * - Token storage in localStorage
 * 
 * @example
 * ```tsx
 * // Admin login page
 * <LoginForm
 *   title="Admin Login"
 *   role="admin"
 *   redirectPath="/admin/dashboard"
 * />
 * 
 * // Teacher login page
 * <LoginForm
 *   title="Login do Facilitador do PG Repense"
 *   role="teacher"
 *   subtitle="Acesse sua contar"
 *   redirectPath="/teacher/dashboard"
 * />
 * ```
 */
export function LoginForm({ title, role, subtitle, redirectPath }: LoginFormProps) {
  const router = useRouter();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  /**
   * Validate form fields before submission
   */
  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    // Email validation
    if (!email) {
      errors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Email inválido';
    }

    // Password validation
    if (!password) {
      errors.password = 'Senha é obrigatória';
    } else if (password.length < 6) {
      errors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setError(null);
    setFieldErrors({});

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Determine API endpoint based on role
      const endpoint = role === 'admin' 
        ? '/api/auth/admin/login' 
        : '/api/auth/teacher/login';

      // Make login request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await response.json();

      // Handle error responses
      if (!response.ok) {
        // Display specific error message from API
        setError(data.error || 'Erro ao fazer login');
        return;
      }

      // Store token in localStorage
      if (data.token) {
        storeAuthToken(data.token);
      }

      // Redirect to dashboard
      router.push(redirectPath);

    } catch (err) {
      console.error('Login error:', err);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <img
            src="/logored.png"
            alt="PG Repense"
            className="mx-auto h-16 w-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-gray-600">
              {subtitle}
            </p>
          )}
        </div>

        {/* Login Card */}
        <div className="bg-white shadow-lg rounded-xl px-8 py-10 border border-gray-100">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 text-center">
                {error}
              </p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <Input
              label="Email"
              type="email"
              placeholder="Digite seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              disabled={loading}
              autoComplete="email"
              autoFocus
            />

            {/* Password Field */}
            <Input
              label="Senha"
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              disabled={loading}
              autoComplete="current-password"
            />

            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                Lembrar-me
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-500">
          PG Repense - Sistema de Gestão
        </p>
      </div>
    </div>
  );
}
