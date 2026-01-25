import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import { GrupoRepense } from '@prisma/client';

export type AvailableClass = {
  id: string;
  grupo_repense: GrupoRepense;
  modelo: string;
  capacidade: number;
  numero_inscritos: number;
  eh_ativo: boolean;
  eh_16h: boolean;
  eh_mulheres: boolean;
  link_whatsapp: string | null;
  data_inicio: Date | null;
  horario: string | null;
  vagas_disponiveis: number;
};

export type AvailableClassesGrouped = {
  [grupo_repense: string]: {
    [city: string]: AvailableClass[];
  };
};

export class EnrollmentError extends Error {
  code: string;
  
  constructor(message: string, code: string = 'ENROLLMENT_ERROR') {
    super(message);
    this.name = 'EnrollmentError';
    this.code = code;
  }
}

// Error codes for UI handling
export const EnrollmentErrorCodes = {
  STUDENT_NOT_FOUND: 'STUDENT_NOT_FOUND',
  CLASS_NOT_FOUND: 'CLASS_NOT_FOUND',
  CLASS_INACTIVE: 'CLASS_INACTIVE',
  CLASS_FULL: 'CLASS_FULL',
  ALREADY_ENROLLED: 'ALREADY_ENROLLED',
  ALREADY_COMPLETED: 'ALREADY_COMPLETED',
  PREVIOUSLY_CANCELLED: 'PREVIOUSLY_CANCELLED',
  WOMEN_ONLY_CLASS: 'WOMEN_ONLY_CLASS',
  ENROLLMENT_NOT_FOUND: 'ENROLLMENT_NOT_FOUND',
  ENROLLMENT_NOT_ACTIVE: 'ENROLLMENT_NOT_ACTIVE',
} as const;

/**
 * Validate enrollment before creating
 * Returns validation result with specific error codes for UI handling
 */
export async function validateEnrollment(
  studentId: string,
  classId: string,
  options: { skipCancelledCheck?: boolean; confirmReEnrollment?: boolean } = {}
): Promise<{
  canEnroll: boolean;
  error?: string;
  code?: string;
  requiresConfirmation?: boolean;
  previousEnrollment?: {
    status: string;
    cancelledAt?: Date | null;
    completedAt?: Date | null;
  };
}> {
  // Check student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, genero: true },
  });

  if (!student) {
    return { canEnroll: false, error: 'Participante não encontrado', code: EnrollmentErrorCodes.STUDENT_NOT_FOUND };
  }

  // Check class exists and is active
  const classToEnroll = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      grupo_repense: true,
      eh_ativo: true,
      capacidade: true,
      numero_inscritos: true,
      eh_mulheres: true,
    },
  });

  if (!classToEnroll) {
    return { canEnroll: false, error: 'Grupo não encontrado', code: EnrollmentErrorCodes.CLASS_NOT_FOUND };
  }

  if (!classToEnroll.eh_ativo) {
    return { canEnroll: false, error: 'Grupo não está ativo', code: EnrollmentErrorCodes.CLASS_INACTIVE };
  }

  if (classToEnroll.numero_inscritos >= classToEnroll.capacidade) {
    return { canEnroll: false, error: 'Grupo está lotado', code: EnrollmentErrorCodes.CLASS_FULL };
  }

  // Check women-only restriction
  if (classToEnroll.eh_mulheres && student.genero === 'Masculino') {
    return { canEnroll: false, error: 'Este grupo é exclusivo para mulheres', code: EnrollmentErrorCodes.WOMEN_ONLY_CLASS };
  }

  // Check for existing enrollments in same grupo_repense
  const existingEnrollments = await prisma.enrollment.findMany({
    where: {
      student_id: studentId,
      Class: {
        grupo_repense: classToEnroll.grupo_repense,
      },
    },
    orderBy: {
      criado_em: 'desc',
    },
  });

  // Check for active enrollment
  const activeEnrollment = existingEnrollments.find((e) => e.status === 'ativo');
  if (activeEnrollment) {
    return {
      canEnroll: false,
      error: `Já possui inscrição ativa em ${classToEnroll.grupo_repense}`,
      code: EnrollmentErrorCodes.ALREADY_ENROLLED,
    };
  }

  // Check for completed enrollment
  const completedEnrollment = existingEnrollments.find((e) => e.status === 'concluido');
  if (completedEnrollment) {
    return {
      canEnroll: false,
      error: `Já concluiu o PG Repense ${classToEnroll.grupo_repense}`,
      code: EnrollmentErrorCodes.ALREADY_COMPLETED,
      previousEnrollment: {
        status: 'concluido',
        completedAt: completedEnrollment.concluido_em,
      },
    };
  }

  // Check for cancelled enrollment (requires confirmation to re-enroll)
  const cancelledEnrollment = existingEnrollments.find((e) => e.status === 'cancelado');
  if (cancelledEnrollment && !options.skipCancelledCheck && !options.confirmReEnrollment) {
    return {
      canEnroll: false,
      error: 'Inscrição anterior foi cancelada',
      code: EnrollmentErrorCodes.PREVIOUSLY_CANCELLED,
      requiresConfirmation: true,
      previousEnrollment: {
        status: 'cancelado',
        cancelledAt: cancelledEnrollment.cancelado_em,
      },
    };
  }

  return { canEnroll: true };
}

/**
 * Enroll a student in a class with atomic operations
 * Validates business rules and ensures race condition safety
 */
export async function enrollStudent(
  studentId: string,
  classId: string,
  options: { confirmReEnrollment?: boolean } = {}
): Promise<{ enrollmentId: string }> {
  // First, check if student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    throw new EnrollmentError('Participante não encontrado', EnrollmentErrorCodes.STUDENT_NOT_FOUND);
  }

  // Check if student already has active enrollment in same grupo_repense
  const classToEnroll = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      grupo_repense: true,
      eh_ativo: true,
      capacidade: true,
      numero_inscritos: true,
      eh_mulheres: true,
    },
  });

  if (!classToEnroll) {
    throw new EnrollmentError('Grupo não encontrado', EnrollmentErrorCodes.CLASS_NOT_FOUND);
  }

  if (!classToEnroll.eh_ativo) {
    throw new EnrollmentError('Grupo não está ativo', EnrollmentErrorCodes.CLASS_INACTIVE);
  }

  // Check women-only restriction
  if (classToEnroll.eh_mulheres && student.genero === 'Masculino') {
    throw new EnrollmentError('Este grupo é exclusivo para mulheres', EnrollmentErrorCodes.WOMEN_ONLY_CLASS);
  }

  // Check for existing enrollments in same grupo_repense
  const existingEnrollments = await prisma.enrollment.findMany({
    where: {
      student_id: studentId,
      Class: {
        grupo_repense: classToEnroll.grupo_repense,
      },
    },
  });

  // Check for active enrollment
  const activeEnrollment = existingEnrollments.find((e) => e.status === 'ativo');
  if (activeEnrollment) {
    throw new EnrollmentError(
      `Já possui inscrição ativa em ${classToEnroll.grupo_repense}`,
      EnrollmentErrorCodes.ALREADY_ENROLLED
    );
  }

  // Check for completed enrollment
  const completedEnrollment = existingEnrollments.find((e) => e.status === 'concluido');
  if (completedEnrollment) {
    throw new EnrollmentError(
      `Já concluiu o PG Repense ${classToEnroll.grupo_repense}`,
      EnrollmentErrorCodes.ALREADY_COMPLETED
    );
  }

  // Check for cancelled enrollment (requires confirmation to re-enroll)
  const cancelledEnrollment = existingEnrollments.find((e) => e.status === 'cancelado');
  if (cancelledEnrollment && !options.confirmReEnrollment) {
    throw new EnrollmentError(
      'Inscrição anterior foi cancelada. Confirme para se reinscrever.',
      EnrollmentErrorCodes.PREVIOUSLY_CANCELLED
    );
  }

  // Use transaction to atomically check capacity and create enrollment
  const result = await prisma.$transaction(async (tx) => {
    // Lock and check class capacity atomically
    const classLocked = await tx.class.findUnique({
      where: { id: classId },
      select: {
        eh_ativo: true,
        capacidade: true,
        numero_inscritos: true,
      },
    });

    if (!classLocked || !classLocked.eh_ativo) {
      throw new EnrollmentError('Class inactive');
    }

    if (classLocked.numero_inscritos >= classLocked.capacidade) {
      throw new EnrollmentError('Class full');
    }

    // Create enrollment
    const enrollment = await tx.enrollment.create({
      data: {
        student_id: studentId,
        class_id: classId,
        status: 'ativo',
      },
    });

    // Increment class enrollment count
    await tx.class.update({
      where: { id: classId },
      data: {
        numero_inscritos: {
          increment: 1,
        },
      },
    });

    return { enrollmentId: enrollment.id };
  });

  return result;
}

/**
 * Transfer student from one class to another
 */
export async function transferStudent(
  enrollmentId: string,
  newClassId: string
): Promise<{
  oldEnrollment: {
    id: string;
    student_id: string;
    class_id: string;
    status: string;
    transferido_de_class_id: string | null;
    concluido_em: Date | null;
    cancelado_em: Date | null;
    criado_em: Date;
  };
  newEnrollment: {
    id: string;
    student_id: string;
    class_id: string;
    status: string;
    transferido_de_class_id: string | null;
    concluido_em: Date | null;
    cancelado_em: Date | null;
    criado_em: Date;
  };
}> {
  // #region agent log
  fetch('http://127.0.0.1:7253/ingest/eba6cdf6-4f69-498e-91cd-4f6f86a2c2d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/enrollment.ts:319',message:'transferStudent entry',data:{hasEnrollmentId:!!enrollmentId,hasNewClassId:!!newClassId},timestamp:Date.now(),sessionId:'debug-session',runId:'run10',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  // First, get the old enrollment with class info
  const oldEnrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      Class: {
        select: {
          id: true,
          grupo_repense: true,
          eh_ativo: true,
          capacidade: true,
          numero_inscritos: true,
        },
      },
    },
  });

  if (!oldEnrollment) {
    throw new EnrollmentError('Inscrição não encontrada', EnrollmentErrorCodes.ENROLLMENT_NOT_FOUND);
  }

  if (oldEnrollment.status !== 'ativo') {
    throw new EnrollmentError('Inscrição não está ativa', EnrollmentErrorCodes.ENROLLMENT_NOT_ACTIVE);
  }

  // Get new class info
  const newClass = await prisma.class.findUnique({
    where: { id: newClassId },
    select: {
      id: true,
      grupo_repense: true,
      eh_ativo: true,
      capacidade: true,
      numero_inscritos: true,
    },
  });

  if (!newClass) {
    throw new EnrollmentError('Novo grupo não encontrado', EnrollmentErrorCodes.CLASS_NOT_FOUND);
  }

  if (!newClass.eh_ativo) {
    throw new EnrollmentError('Novo grupo não está ativo', EnrollmentErrorCodes.CLASS_INACTIVE);
  }

  const existingEnrollmentInTarget = await prisma.enrollment.findFirst({
    where: {
      student_id: oldEnrollment.student_id,
      class_id: newClassId,
    },
    select: {
      id: true,
      status: true,
    },
  });
  // #region agent log
  fetch('http://127.0.0.1:7253/ingest/eba6cdf6-4f69-498e-91cd-4f6f86a2c2d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/enrollment.ts:373',message:'Target enrollment check',data:{isSameClass:oldEnrollment.class_id===newClassId,hasExistingTarget:!!existingEnrollmentInTarget,existingStatus:existingEnrollmentInTarget?.status ?? null},timestamp:Date.now(),sessionId:'debug-session',runId:'run10',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion

  if (existingEnrollmentInTarget?.status === 'concluido') {
    throw new EnrollmentError('O participante já concluiu esse PG Repense', EnrollmentErrorCodes.ALREADY_COMPLETED);
  }

  // Use transaction for atomic transfer
  const result = await prisma.$transaction(async (tx) => {
    // Update old enrollment to transferido
    const updatedOldEnrollment = await tx.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'transferido',
        transferido_de_class_id: oldEnrollment.class_id,
      },
    });

    // Decrement old class enrollment count
    await tx.class.update({
      where: { id: oldEnrollment.class_id },
      data: {
        numero_inscritos: {
          decrement: 1,
        },
      },
    });

    // Check for existing enrollment in target class inside transaction
    const targetEnrollment = await tx.enrollment.findFirst({
      where: {
        student_id: oldEnrollment.student_id,
        class_id: newClassId,
      },
    });

    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/eba6cdf6-4f69-498e-91cd-4f6f86a2c2d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/enrollment.ts:393',message:'Transfer target resolved (tx)',data:{hasTarget:!!targetEnrollment,targetStatus:targetEnrollment?.status ?? null},timestamp:Date.now(),sessionId:'debug-session',runId:'run10',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion

    if (targetEnrollment?.status === 'concluido') {
      throw new EnrollmentError('você já concluiu esse PG Repense', EnrollmentErrorCodes.ALREADY_COMPLETED);
    }

    if (targetEnrollment && targetEnrollment.status === 'ativo') {
      return {
        oldEnrollment: updatedOldEnrollment,
        newEnrollment: targetEnrollment,
      };
    }

    // Lock and check new class capacity atomically only if we need to add a seat
    const newClassLocked = await tx.class.findUnique({
      where: { id: newClassId },
      select: {
        eh_ativo: true,
        capacidade: true,
        numero_inscritos: true,
      },
    });

    if (!newClassLocked || !newClassLocked.eh_ativo) {
      throw new EnrollmentError('New class inactive');
    }

    if (newClassLocked.numero_inscritos >= newClassLocked.capacidade) {
      throw new EnrollmentError('New class full');
    }

    if (targetEnrollment) {
      const reactivatedEnrollment = await tx.enrollment.update({
        where: { id: targetEnrollment.id },
        data: {
          status: 'ativo',
          transferido_de_class_id: oldEnrollment.class_id,
          cancelado_em: null,
          concluido_em: null,
        },
      });

      await tx.class.update({
        where: { id: newClassId },
        data: {
          numero_inscritos: {
            increment: 1,
          },
        },
      });

      return {
        oldEnrollment: updatedOldEnrollment,
        newEnrollment: reactivatedEnrollment,
      };
    }

    // Create new enrollment
    const newEnrollment = await tx.enrollment.create({
      data: {
        student_id: oldEnrollment.student_id,
        class_id: newClassId,
        status: 'ativo',
        transferido_de_class_id: oldEnrollment.class_id,
      },
    });

    // Increment new class enrollment count
    await tx.class.update({
      where: { id: newClassId },
      data: {
        numero_inscritos: {
          increment: 1,
        },
      },
    });

    return {
      oldEnrollment: updatedOldEnrollment,
      newEnrollment,
    };
  });

  return result;
}

/**
 * Complete an enrollment (mark as concluido)
 */
export async function completeEnrollment(
  enrollmentId: string
): Promise<void> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      class_id: true,
      status: true,
    },
  });

  if (!enrollment) {
    throw new EnrollmentError('Inscrição não encontrada', EnrollmentErrorCodes.ENROLLMENT_NOT_FOUND);
  }

  if (enrollment.status !== 'ativo') {
    throw new EnrollmentError('Inscrição não está ativa', EnrollmentErrorCodes.ENROLLMENT_NOT_ACTIVE);
  }

  await prisma.$transaction(async (tx) => {
    // Update enrollment status
    await tx.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'concluido',
        concluido_em: new Date(),
      },
    });

    // Decrement class enrollment count
    await tx.class.update({
      where: { id: enrollment.class_id },
      data: {
        numero_inscritos: {
          decrement: 1,
        },
      },
    });
  });
}

/**
 * Cancel an enrollment
 */
export async function cancelEnrollment(enrollmentId: string): Promise<void> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      class_id: true,
      status: true,
    },
  });

  if (!enrollment) {
    throw new EnrollmentError('Inscrição não encontrada', EnrollmentErrorCodes.ENROLLMENT_NOT_FOUND);
  }

  if (enrollment.status !== 'ativo') {
    throw new EnrollmentError('Inscrição não está ativa', EnrollmentErrorCodes.ENROLLMENT_NOT_ACTIVE);
  }

  await prisma.$transaction(async (tx) => {
    // Update enrollment status
    await tx.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'cancelado',
        cancelado_em: new Date(),
      },
    });

    // Decrement class enrollment count
    await tx.class.update({
      where: { id: enrollment.class_id },
      data: {
        numero_inscritos: {
          decrement: 1,
        },
      },
    });
  });
}

/**
 * Get available classes for a student
 * Filters out classes from grupos_repense where student is already enrolled/completed
 * Also filters by gender if provided
 */
export async function getAvailableClasses(
  studentId: string,
  genero?: string
): Promise<AvailableClassesGrouped> {
  // Get student's completed/active enrollments by grupo_repense
  const studentEnrollments = await prisma.enrollment.findMany({
    where: {
      student_id: studentId,
      status: {
        in: ['ativo', 'concluido'],
      },
    },
    include: {
      Class: {
        select: {
          grupo_repense: true,
        },
      },
    },
  });

  // Extract excluded grupos
  const excludedGrupos = new Set<GrupoRepense>(
    studentEnrollments.map((e) => e.Class.grupo_repense)
  );

  // Build where clause
  const whereClause: Prisma.ClassWhereInput = {
    eh_ativo: true,
  };

  // Exclude grupos where student is already enrolled/completed
  if (excludedGrupos.size > 0) {
    whereClause.grupo_repense = {
      notIn: Array.from(excludedGrupos),
    };
  }

  // Filter out women-only classes if student is male
  if (genero === 'Masculino') {
    whereClause.eh_mulheres = false;
  }

  // Fetch available classes
  const classes = await prisma.class.findMany({
    where: whereClause,
    orderBy: [
      { grupo_repense: 'asc' },
      { cidade: 'asc' },
      { data_inicio: 'asc' },
    ],
  });

  // Calculate vagas_disponiveis and group by grupo_repense and city
  const grouped: AvailableClassesGrouped = {};

  for (const classItem of classes) {
    const grupo = classItem.grupo_repense;
    const city = classItem.cidade === 'Itu' ? 'ITU' : (classItem.cidade || 'Other');

    if (!grouped[grupo]) {
      grouped[grupo] = {};
    }

    if (!grouped[grupo][city]) {
      grouped[grupo][city] = [];
    }

    grouped[grupo][city].push({
      id: classItem.id,
      grupo_repense: classItem.grupo_repense,
      modelo: classItem.modelo,
      capacidade: classItem.capacidade,
      numero_inscritos: classItem.numero_inscritos,
      eh_ativo: classItem.eh_ativo,
      eh_16h: classItem.eh_16h,
      eh_mulheres: classItem.eh_mulheres,
      link_whatsapp: classItem.link_whatsapp,
      data_inicio: classItem.data_inicio,
      horario: classItem.horario,
      vagas_disponiveis:
        classItem.capacidade - classItem.numero_inscritos,
    });
  }

  return grouped;
}
