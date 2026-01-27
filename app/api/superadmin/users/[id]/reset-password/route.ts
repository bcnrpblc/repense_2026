import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { requireSuperadmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateRandomPassword } from '@/lib/password';
import { rateLimit } from '@/lib/rateLimit';
import { ForbiddenError } from '@/lib/errors';
import { logAuditEvent } from '@/lib/audit';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).optional(),
});

/**
 * POST /api/superadmin/users/[id]/reset-password
 *
 * Reset password for admin or teacher.
 * Returns the new plaintext password once.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Rate limit: 10 resets per hour per superadmin
  const rateLimitResult = rateLimit(request, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'password-reset',
  });
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const superadmin = await requireSuperadmin(request);

    const body = await request.json();
    const { newPassword } = resetPasswordSchema.parse(body);

    const plainPassword = newPassword || generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Determine user type and update
    let user: { id: string; email: string } | null = null;
    let userType: 'admin' | 'teacher' | null = null;

    const admin = await prisma.admin.findUnique({
      where: { id: params.id },
      select: { id: true, email: true },
    });

    if (admin) {
      user = admin;
      userType = 'admin';
    } else {
      const teacher = await prisma.teacher.findUnique({
        where: { id: params.id },
        select: { id: true, email: true },
      });
      if (teacher) {
        user = teacher;
        userType = 'teacher';
      }
    }

    if (!user || !userType) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    if (userType === 'admin') {
      await prisma.admin.update({
        where: { id: params.id },
        data: { password_hash: hashedPassword },
      });
    } else {
      await prisma.teacher.update({
        where: { id: params.id },
        data: { password_hash: hashedPassword },
      });
    }

    // Audit log
    await logAuditEvent(
      {
        event_type: 'admin_password_reset',
        actor_id: superadmin.adminId,
        actor_type: 'admin',
        target_entity: userType === 'admin' ? 'Admin' : 'Teacher',
        target_id: params.id,
        action: 'password_reset',
        metadata: {
          target_email: user.email,
          target_type: userType,
        },
      },
      request
    );

    return NextResponse.json({
      success: true,
      newPassword: plainPassword,
      message: 'Senha redefinida com sucesso',
    });
  } catch (error) {
    console.error('Error resetting password:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: 'Acesso de superadmin é obrigatório' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

