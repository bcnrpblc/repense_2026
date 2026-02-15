import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { rateLimit, RateLimitConfigs } from '@/lib/rateLimit';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

/**
 * Zod schema for teacher login request validation
 * - email: Must be a valid email format
 * - password: Minimum 6 characters
 */
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  rememberMe: z.boolean().optional().default(false),
});

// ============================================================================
// POST /api/auth/teacher/login
// ============================================================================

/**
 * Teacher login endpoint
 * 
 * Authenticates a teacher with email and password, returns a JWT token.
 * 
 * Request body:
 * {
 *   "email": "facilitador@example.com",
 *   "password": "senha123"
 * }
 * 
 * Success response (200):
 * {
 *   "token": "eyJhbGciOiJIUzI1NiIs...",
 *   "teacher": {
 *     "id": "uuid",
 *     "nome": "Facilitador Name",
 *     "email": "facilitador@example.com"
 *   }
 * }
 * 
 * Error responses:
 * - 400: Invalid request data (Zod validation failed)
 * - 401: "Credenciais inválidas" (wrong email or password)
 * - 403: "Facilitador inativo" (teacher is deactivated)
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting (10 requests per minute)
  const rateLimitResult = rateLimit(request, RateLimitConfigs.auth);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const { email, password, rememberMe } = loginSchema.parse(body);

    // Find teacher by email
    const teacher = await prisma.teacher.findUnique({
      where: { email },
      select: {
        id: true,
        nome: true,
        email: true,
        password_hash: true,
        eh_ativo: true,
        eh_admin: true,
        telefone: true,
      },
    });

    // Teacher not found - return generic error to prevent email enumeration
    if (!teacher) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Check if teacher is active
    if (!teacher.eh_ativo) {
      return NextResponse.json(
        { error: 'Facilitador inativo' },
        { status: 403 }
      );
    }

    // Verify password using bcrypt
    const isValidPassword = await bcrypt.compare(password, teacher.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Generate JWT token with teacher payload
    // Token expires in 90 days if rememberMe is true, otherwise 30 days
    const expiresIn = rememberMe ? '90d' : '30d';
    const token = jwt.sign(
      {
        teacherId: teacher.id,
        email: teacher.email,
        role: 'teacher' as const,
        eh_admin: teacher.eh_admin, // Include admin access flag
      },
      process.env.JWT_SECRET!,
      { expiresIn }
    );

    // Return token and teacher info (excluding password_hash)
    return NextResponse.json({
      token,
      teacher: {
        id: teacher.id,
        nome: teacher.nome,
        email: teacher.email,
        eh_admin: teacher.eh_admin,
      },
    });

  } catch (error) {
    console.error('Error logging in teacher:', error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: error.issues.map((e: z.ZodIssue) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
