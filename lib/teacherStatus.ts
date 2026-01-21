import { prisma } from '@/lib/prisma';

// ============================================================================
// TEACHER STATUS SYNC
// ============================================================================

export type SyncTeachersResult = {
  activatedCount: number;
  deactivatedCount: number;
};

/**
 * Sync teacher `eh_ativo` flag based on active, non-archived classes.
 *
 * Regra:
 * - Se professor tem pelo menos 1 turma ativa (eh_ativo = true, arquivada = false) => teacher.eh_ativo = true
 * - Se professor não tem turmas ativas => teacher.eh_ativo = false
 */
export async function syncTeachersActiveStatus(): Promise<SyncTeachersResult> {
  // Load teachers with their active, non-archived classes
  const teachers = await prisma.teacher.findMany({
    select: {
      id: true,
      Class: {
        where: {
          eh_ativo: true,
          arquivada: false,
        },
        select: { id: true },
      },
    },
  });

  const toActivate: string[] = [];
  const toDeactivate: string[] = [];

  for (const teacher of teachers) {
    const hasActiveClass = teacher.Class.length > 0;
    if (hasActiveClass) {
      toActivate.push(teacher.id);
    } else {
      toDeactivate.push(teacher.id);
    }
  }

  let activatedCount = 0;
  let deactivatedCount = 0;

  if (toActivate.length > 0) {
    const result = await prisma.teacher.updateMany({
      where: { id: { in: toActivate } },
      data: { eh_ativo: true },
    });
    activatedCount = result.count;
  }

  if (toDeactivate.length > 0) {
    const result = await prisma.teacher.updateMany({
      where: { id: { in: toDeactivate } },
      data: { eh_ativo: false },
    });
    deactivatedCount = result.count;
  }

  return { activatedCount, deactivatedCount };
}

