// ============================================================================
// AUTHENTICATION TYPE DEFINITIONS
// ============================================================================
// Shared type definitions for both client and server code
// This file has no imports and is safe to use in both environments
// ============================================================================

/**
 * Admin JWT token payload structure
 */
export type AdminTokenPayload = {
  adminId: string;
  email: string;
  role?: 'admin' | 'superadmin'; // Optional for backward compatibility
};

/**
 * Teacher JWT token payload structure
 */
export type TeacherTokenPayload = {
  teacherId: string;
  email: string;
  role: 'teacher';
};

/**
 * Unified auth user type for both admin and teacher
 * Used by components that need to work with either user type
 */
export type AuthUser = {
  id: string;
  email: string;
  role: 'admin' | 'teacher';
};

/**
 * Combined token payload type (can be either admin or teacher)
 */
export type TokenPayload = AdminTokenPayload | TeacherTokenPayload;
