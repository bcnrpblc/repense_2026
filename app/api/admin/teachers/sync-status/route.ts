import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { syncTeachersActiveStatus } from '@/lib/teacherStatus';

// ============================================================================
// POST /api/admin/teachers/sync-status
// ============================================================================

/**
 * Sincroniza o status (eh_ativo) dos líderes com base nas turmas.
 *
 * Regra:
 * - Professor com pelo menos 1 turma ativa (eh_ativo = true, arquivada = false) => eh_ativo = true
 * - Professor sem turmas ativas => eh_ativo = false
 */
export async function POST(request: NextRequest) {
  try {
    await verifyAdminToken(request);

    const { activatedCount, deactivatedCount } =
      await syncTeachersActiveStatus();

    return NextResponse.json({
      success: true,
      message: 'Status dos líderes sincronizado com sucesso',
      activatedCount,
      deactivatedCount,
    });
  } catch (error) {
    console.error('Error syncing teacher statuses:', error);

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

