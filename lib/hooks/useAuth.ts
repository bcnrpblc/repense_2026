'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isTokenExpired, decodeToken } from '@/lib/auth-client';
import type { AuthUser } from '@/lib/auth-types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Return type for the useAuth hook
 */
export type UseAuthReturn = {
  /** The authenticated user or null if not authenticated */
  user: AuthUser | null;
  /** True while checking authentication status */
  loading: boolean;
  /** Error message if authentication failed */
  error: string | null;
  /** Function to log out the user */
  logout: () => void;
  /** The raw JWT token (for API calls) */
  token: string | null;
  /** Function to refresh user data from the API */
  refreshUser: () => Promise<void>;
};

/**
 * Configuration options for useAuth hook
 */
export type UseAuthOptions = {
  /** The required role ('admin' | 'teacher'). If set, redirects if role doesn't match */
  requiredRole?: 'admin' | 'teacher';
  /** 
   * If true, allows access for admins OR teachers with eh_admin flag.
   * Use this for admin routes that teacher-admins should access.
   */
  requiredAdminAccess?: boolean;
  /** Whether to redirect to login if not authenticated. Default: true */
  redirectOnFail?: boolean;
  /** Custom login path to redirect to. Default: based on role */
  loginPath?: string;
};

// ============================================================================
// TOKEN STORAGE UTILITIES
// ============================================================================

const TOKEN_KEY = 'auth_token';

/**
 * Get token from localStorage (client-side only)
 */
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store token in localStorage
 */
function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove token from localStorage
 */
function removeStoredToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

// ============================================================================
// useAuth HOOK
// ============================================================================

/**
 * Authentication hook for managing user authentication state
 * 
 * Features:
 * - Checks token validity on mount
 * - Auto-redirects to login if not authenticated (configurable)
 * - Provides logout function
 * - Handles token refresh
 * - Supports role-based access control
 * 
 * @param options - Configuration options
 * @returns UseAuthReturn object with auth state and functions
 * 
 * @example
 * ```tsx
 * // In an admin component
 * const { user, loading, logout } = useAuth({ requiredRole: 'admin' });
 * 
 * if (loading) return <Spinner />;
 * if (!user) return null; // Redirected to login
 * 
 * return <div>Welcome, {user.email}</div>;
 * ```
 * 
 * @example
 * ```tsx
 * // In a teacher component
 * const { user, loading, token } = useAuth({ 
 *   requiredRole: 'teacher',
 *   loginPath: '/teacher/login'
 * });
 * 
 * // Use token for API calls
 * const res = await fetch('/api/teacher/classes', {
 *   headers: { Authorization: `Bearer ${token}` }
 * });
 * ```
 */
export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const {
    requiredRole,
    requiredAdminAccess,
    redirectOnFail = true,
    loginPath,
  } = options;

  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  /**
   * Determine the login path based on role
   */
  const getLoginPath = useCallback(() => {
    if (loginPath) return loginPath;
    if (requiredRole === 'admin') return '/admin/login';
    if (requiredRole === 'teacher') return '/teacher/login';
    return '/admin/login'; // Default
  }, [loginPath, requiredRole]);

  /**
   * Logout function - clears token and redirects to login
   */
  const logout = useCallback(() => {
    removeStoredToken();
    setUser(null);
    setToken(null);
    setError(null);
    router.push(getLoginPath());
  }, [router, getLoginPath]);

  /**
   * Refresh user data from the API
   */
  const refreshUser = useCallback(async () => {
    const storedToken = getStoredToken();
    if (!storedToken) {
      setUser(null);
      return;
    }

    try {
      // Determine the /me endpoint based on role
      const decoded = decodeToken(storedToken);
      const endpoint = decoded && 'teacherId' in decoded
        ? '/api/auth/teacher/me'
        : '/api/auth/admin/me';

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const data = await response.json();
      
      // Extract user based on response structure
      if (data.teacher) {
        setUser({
          id: data.teacher.id,
          email: data.teacher.email,
          role: 'teacher',
          hasAdminAccess: data.teacher.eh_admin || false,
        });
      } else if (data.admin) {
        setUser({
          id: data.admin.id,
          email: data.admin.email,
          role: 'admin',
          hasAdminAccess: true, // Admins always have admin access
        });
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
      // Don't logout on refresh error, just log it
    }
  }, []);

  /**
   * Check authentication on mount
   */
  useEffect(() => {
    async function checkAuth() {
      setLoading(true);
      setError(null);

      try {
        const storedToken = getStoredToken();

        // No token found
        if (!storedToken) {
          if (redirectOnFail) {
            router.push(getLoginPath());
          }
          setLoading(false);
          return;
        }

        // Check if token is expired
        if (isTokenExpired(storedToken)) {
          removeStoredToken();
          setError('Sessão expirada');
          if (redirectOnFail) {
            router.push(getLoginPath());
          }
          setLoading(false);
          return;
        }

        // Decode token to get user info
        const decoded = decodeToken(storedToken);
        if (!decoded) {
          removeStoredToken();
          setError('Token inválido');
          if (redirectOnFail) {
            router.push(getLoginPath());
          }
          setLoading(false);
          return;
        }

        // Build user object from token
        let currentUser: AuthUser;
        if ('adminId' in decoded && decoded.adminId) {
          currentUser = {
            id: decoded.adminId,
            email: decoded.email,
            role: 'admin',
            hasAdminAccess: true, // Admins always have admin access
          };
        } else if ('teacherId' in decoded && decoded.teacherId) {
          // Check if teacher has admin access from JWT
          const ehAdmin = 'eh_admin' in decoded ? !!decoded.eh_admin : false;
          currentUser = {
            id: decoded.teacherId,
            email: decoded.email,
            role: 'teacher',
            hasAdminAccess: ehAdmin, // Teacher has admin access if eh_admin is true
          };
        } else {
          removeStoredToken();
          setError('Token inválido');
          if (redirectOnFail) {
            router.push(getLoginPath());
          }
          setLoading(false);
          return;
        }

        // Check requiredAdminAccess: allows admin OR teacher with eh_admin
        if (requiredAdminAccess && !currentUser.hasAdminAccess) {
          setError('Acesso não autorizado');
          if (redirectOnFail) {
            router.push(getLoginPath());
          }
          setLoading(false);
          return;
        }

        // Check role requirement (stricter than requiredAdminAccess)
        if (requiredRole && currentUser.role !== requiredRole) {
          setError('Acesso não autorizado');
          if (redirectOnFail) {
            // Redirect to the correct login page for the required role
            router.push(getLoginPath());
          }
          setLoading(false);
          return;
        }

        // Authentication successful
        setUser(currentUser);
        setToken(storedToken);

      } catch (err) {
        console.error('Auth check error:', err);
        setError('Erro ao verificar autenticação');
        if (redirectOnFail) {
          router.push(getLoginPath());
        }
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [redirectOnFail, requiredRole, router, getLoginPath]);

  return {
    user,
    loading,
    error,
    logout,
    token,
    refreshUser,
  };
}

// ============================================================================
// UTILITY FUNCTIONS (exported for use in login pages)
// ============================================================================

/**
 * Store authentication token after successful login
 * @param token - The JWT token to store
 */
export function storeAuthToken(token: string): void {
  setStoredToken(token);
}

/**
 * Clear authentication token
 */
export function clearAuthToken(): void {
  removeStoredToken();
}

/**
 * Get the current authentication token
 * @returns The stored token or null
 */
export function getAuthToken(): string | null {
  return getStoredToken();
}
