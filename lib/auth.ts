import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { ForbiddenError } from '@/lib/errors';
import type {
  AdminTokenPayload,
  TeacherTokenPayload,
  AuthUser,
  TokenPayload,
} from './auth-types';

// Re-export types for backward compatibility with existing server code
export type {
  AdminTokenPayload,
  TeacherTokenPayload,
  AuthUser,
  TokenPayload,
} from './auth-types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract JWT token from Authorization header
 * Expects format: "Bearer <token>"
 */
function extractToken(request: NextRequest): string {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  if (!token) {
    throw new Error('Missing token');
  }

  return token;
}

/**
 * Get JWT secret from environment
 * Throws if not configured
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  return secret;
}

/**
 * Verify and decode a JWT token
 * Returns the decoded payload or throws an error
 */
function verifyAndDecode<T>(token: string, secret: string): T {
  try {
    return jwt.verify(token, secret) as T;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error) {
      const jwtError = error as { name: string };
      if (jwtError.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      if (jwtError.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
    }
    throw new Error('Token verification failed');
  }
}

// ============================================================================
// ADMIN AUTHENTICATION
// ============================================================================

/**
 * Verify admin JWT token from Authorization header
 * Returns the decoded token payload or throws an error
 * 
 * @param request - The Next.js request object
 * @returns Promise<AdminTokenPayload> - The decoded admin payload
 * @throws Error if token is missing, invalid, or expired
 * 
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   try {
 *     const admin = await verifyAdminToken(request);
 *     // admin.adminId, admin.email available
 *   } catch (error) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 * }
 * ```
 */
export async function verifyAdminToken(
  request: NextRequest
): Promise<AdminTokenPayload> {
  const token = extractToken(request);
  const secret = getJwtSecret();
  const decoded = verifyAndDecode<AdminTokenPayload>(token, secret);

  // Verify this is an admin token (has adminId)
  if (!decoded.adminId) {
    throw new Error('Invalid admin token');
  }

  return decoded;
}

/**
 * Verify admin token and ensure the authenticated admin is a superadmin.
 * Fetches the admin from the database to guarantee the latest role.
 *
 * @param request - The Next.js request object
 * @returns Promise<{ adminId: string; email: string; role: string }>
 * @throws Error if not authenticated or not superadmin
 */
export async function requireSuperadmin(
  request: NextRequest
): Promise<{
  adminId: string;
  email: string;
  role: string;
}> {
  const tokenPayload = await verifyAdminToken(request);

  const admin = await prisma.admin.findUnique({
    where: { id: tokenPayload.adminId },
    select: { id: true, email: true, role: true },
  });

  if (!admin) {
    throw new Error('Admin not found');
  }

  if (admin.role !== 'superadmin') {
    throw new ForbiddenError('Superadmin access required');
  }

  return {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
  };
}

/**
 * Verify either admin token OR teacher token with eh_admin access.
 * Use this for admin API routes that teacher-admins should also access.
 * 
 * For teacher tokens, verifies eh_admin from database (not JWT) for security.
 * 
 * @param request - The Next.js request object
 * @returns Promise<{ adminId: string; email: string; isTeacherAdmin: boolean }>
 * @throws Error if not authenticated or teacher doesn't have admin access
 */
export async function verifyAdminOrTeacherAdminToken(
  request: NextRequest
): Promise<{
  adminId: string;
  email: string;
  isTeacherAdmin: boolean;
}> {
  const token = extractToken(request);
  const secret = getJwtSecret();
  const decoded = verifyAndDecode<TokenPayload>(token, secret);

  // If admin token, use standard admin flow
  if ('adminId' in decoded && decoded.adminId) {
    return {
      adminId: decoded.adminId,
      email: decoded.email,
      isTeacherAdmin: false,
    };
  }

  // If teacher token, verify eh_admin from database
  if ('teacherId' in decoded && decoded.teacherId) {
    const teacher = await prisma.teacher.findUnique({
      where: { id: decoded.teacherId },
      select: { id: true, email: true, eh_admin: true, eh_ativo: true },
    });

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    if (!teacher.eh_ativo) {
      throw new Error('Teacher account is inactive');
    }

    if (!teacher.eh_admin) {
      throw new ForbiddenError('Teacher does not have admin access');
    }

    return {
      adminId: teacher.id, // Use teacher ID as adminId for consistency
      email: teacher.email,
      isTeacherAdmin: true,
    };
  }

  throw new Error('Invalid token payload');
}

// ============================================================================
// TEACHER AUTHENTICATION
// ============================================================================

/**
 * Verify teacher JWT token from Authorization header
 * Returns the decoded token payload or throws an error
 * 
 * @param request - The Next.js request object
 * @returns Promise<TeacherTokenPayload> - The decoded teacher payload
 * @throws Error if token is missing, invalid, expired, or not a teacher token
 * 
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   try {
 *     const teacher = await verifyTeacherToken(request);
 *     // teacher.teacherId, teacher.email, teacher.role available
 *   } catch (error) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 * }
 * ```
 */
export async function verifyTeacherToken(
  request: NextRequest
): Promise<TeacherTokenPayload> {
  const token = extractToken(request);
  const secret = getJwtSecret();
  const decoded = verifyAndDecode<TeacherTokenPayload>(token, secret);

  // Verify this is a teacher token (has teacherId and role: 'teacher')
  if (!decoded.teacherId || decoded.role !== 'teacher') {
    throw new Error('Invalid teacher token');
  }

  return decoded;
}

// ============================================================================
// GENERIC TOKEN VERIFICATION
// ============================================================================

/**
 * Generic token verification that works for both admin and teacher
 * Returns a unified AuthUser object
 * 
 * @param request - The Next.js request object
 * @returns Promise<AuthUser> - Unified user object with id, email, and role
 * @throws Error if token is missing, invalid, or expired
 * 
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   try {
 *     const user = await verifyToken(request);
 *     if (user.role === 'admin') {
 *       // Admin-specific logic
 *     } else {
 *       // Teacher-specific logic
 *     }
 *   } catch (error) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 * }
 * ```
 */
export async function verifyToken(request: NextRequest): Promise<AuthUser> {
  const token = extractToken(request);
  const secret = getJwtSecret();
  const decoded = verifyAndDecode<TokenPayload>(token, secret);

  // Determine if this is an admin or teacher token
  if ('adminId' in decoded && decoded.adminId) {
    return {
      id: decoded.adminId,
      email: decoded.email,
      role: 'admin',
    };
  }

  if ('teacherId' in decoded && decoded.teacherId) {
    return {
      id: decoded.teacherId,
      email: decoded.email,
      role: 'teacher',
    };
  }

  throw new Error('Invalid token payload');
}
