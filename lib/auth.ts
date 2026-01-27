import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { ForbiddenError } from '@/lib/errors';

// ============================================================================
// TYPE DEFINITIONS
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

// ============================================================================
// CLIENT-SIDE TOKEN UTILITIES
// ============================================================================

/**
 * Decode a JWT token without verification (client-side use only)
 * This is useful for reading token payload on the client
 * WARNING: Do not trust the output - always verify on the server
 * 
 * @param token - The JWT token string
 * @returns The decoded payload or null if invalid
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.decode(token);
    return decoded as TokenPayload | null;
  } catch {
    return null;
  }
}

/**
 * Check if a token is expired (client-side check)
 * 
 * @param token - The JWT token string
 * @returns true if expired, false if valid
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (!decoded?.exp) return true;
    
    // exp is in seconds, Date.now() is in milliseconds
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
