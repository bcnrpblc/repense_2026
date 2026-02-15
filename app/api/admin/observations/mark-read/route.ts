import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminOrTeacherAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const markReadSchema = z.object({
  observationIds: z.array(z.string()).min(1),
});

// ============================================================================
// POST /api/admin/observations/mark-read
// ============================================================================

/**
 * Mark observations as read by admin
 */
export async function POST(request: NextRequest) {
  try {
    await verifyAdminOrTeacherAdminToken(request);

    const body = await request.json();
    const { observationIds } = markReadSchema.parse(body);

    // Update all observations to mark as read
    const result = await prisma.attendance.updateMany({
      where: {
        id: {
          in: observationIds,
        },
        observacao: {
          not: null,
        },
        lida_por_admin: false,
      },
      data: {
        lida_por_admin: true,
        lida_em: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      markedCount: result.count,
    });

  } catch (error) {
    console.error('Error marking observations as read:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
