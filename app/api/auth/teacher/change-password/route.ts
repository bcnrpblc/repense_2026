import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Senha atual inválida'),
  newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
});

// ============================================================================
// POST /api/auth/teacher/change-password
// ============================================================================

/**
 * Permite o facilitador trocar sua própria senha.
 *
 * Regras:
 * - Requer token de facilitador válido (Authorization: Bearer <token>)
 * - Deve informar senha atual correta
 * - Nova senha mínima de 8 caracteres
 */
export async function POST(request: NextRequest) {
  try {
    // Autentica facilitador via JWT
    const tokenPayload = await verifyTeacherToken(request);

    const body = await request.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    // Busca facilitador no banco
    const teacher = await prisma.teacher.findUnique({
      where: { id: tokenPayload.teacherId },
      select: {
        id: true,
        password_hash: true,
        eh_ativo: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: 'Facilitador não encontrado' },
        { status: 404 }
      );
    }

    if (!teacher.eh_ativo) {
      return NextResponse.json(
        { error: 'Facilitador inativo' },
        { status: 403 }
      );
    }

    // Valida senha atual
    const isValidCurrent = await bcrypt.compare(
      currentPassword,
      teacher.password_hash
    );

    if (!isValidCurrent) {
      return NextResponse.json(
        { error: 'Senha atual incorreta' },
        { status: 400 }
      );
    }

    // Opcional: impedir reutilizar a mesma senha
    const isSamePassword = await bcrypt.compare(
      newPassword,
      teacher.password_hash
    );
    if (isSamePassword) {
      return NextResponse.json(
        { error: 'Nova senha deve ser diferente da senha atual' },
        { status: 400 }
      );
    }

    // Gera novo hash
    const newHash = await bcrypt.hash(newPassword, 10);

    await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        password_hash: newHash,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso',
    });
  } catch (error) {
    console.error('Error changing teacher password:', error);

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

    if (error instanceof Error) {
      if (
        error.message.includes('token') ||
        error.message.includes('authorization') ||
        error.message.includes('expired')
      ) {
        return NextResponse.json(
          { error: 'Não autorizado' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

