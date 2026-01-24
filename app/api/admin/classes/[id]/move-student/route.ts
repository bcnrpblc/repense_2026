import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { transferStudent, EnrollmentError } from '@/lib/enrollment';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const moveStudentSchema = z.object({
  studentId: z.string().min(1, 'ID do participante é obrigatório'),
  newClassId: z.string().min(1, 'ID do novo grupo é obrigatório'),
});

// ============================================================================
// POST /api/admin/classes/[id]/move-student
// ============================================================================

/**
 * Move a student from current class to a new class
 * Uses the transferStudent function from lib/enrollment.ts
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminToken(request);

    const body = await request.json();
    const { studentId, newClassId } = moveStudentSchema.parse(body);
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/eba6cdf6-4f69-498e-91cd-4f6f86a2c2d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/classes/[id]/move-student/route.ts:32',message:'Move student parsed',data:{currentClassId:params.id,newClassId},timestamp:Date.now(),sessionId:'debug-session',runId:'run10',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion

    const currentClassId = params.id;

    // Verify current class exists
    const currentClass = await prisma.class.findUnique({
      where: { id: currentClassId },
      select: {
        id: true,
        grupo_repense: true,
      },
    });


    if (!currentClass) {
      return NextResponse.json(
        { error: 'Grupo atual não encontrado' },
        { status: 404 }
      );
    }

    // Verify new class exists and has same grupo_repense
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
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/eba6cdf6-4f69-498e-91cd-4f6f86a2c2d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/classes/[id]/move-student/route.ts:56',message:'Classes resolved',data:{hasCurrentClass:!!currentClass,hasNewClass:!!newClass,currentGrupo:currentClass?.grupo_repense ?? null,newGrupo:newClass?.grupo_repense ?? null},timestamp:Date.now(),sessionId:'debug-session',runId:'run10',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion


    if (!newClass) {
      return NextResponse.json(
        { error: 'Novo grupo não encontrado' },
        { status: 404 }
      );
    }

    // Allow transfers across any grupo_repense from admin panel
    // Allow cross-grupo transfers from admin panel

    // Find the active enrollment for this student in this class
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        student_id: studentId,
        class_id: currentClassId,
        status: 'ativo',
      },
    });
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/eba6cdf6-4f69-498e-91cd-4f6f86a2c2d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/classes/[id]/move-student/route.ts:80',message:'Active enrollment lookup',data:{hasEnrollment:!!enrollment},timestamp:Date.now(),sessionId:'debug-session',runId:'run10',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Inscrição ativa não encontrada para este participante nesse grupo' },
        { status: 404 }
      );
    }

    // Use the transferStudent function
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/eba6cdf6-4f69-498e-91cd-4f6f86a2c2d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/classes/[id]/move-student/route.ts:90',message:'Calling transferStudent',data:{enrollmentId:enrollment.id,newClassId},timestamp:Date.now(),sessionId:'debug-session',runId:'run10',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    const result = await transferStudent(enrollment.id, newClassId);

    return NextResponse.json({
      message: 'Participante transferido com sucesso',
      oldEnrollment: result.oldEnrollment,
      newEnrollment: result.newEnrollment,
    });

  } catch (error) {
    console.error('Error moving student:', error);
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/eba6cdf6-4f69-498e-91cd-4f6f86a2c2d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/classes/[id]/move-student/route.ts:102',message:'Move student failed',data:{errorName:error instanceof Error ? error.name : typeof error,errorMessage:error instanceof Error ? error.message : String(error),errorCode:typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: string }).code ?? null : null},timestamp:Date.now(),sessionId:'debug-session',runId:'run10',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof EnrollmentError) {
      const messages: Record<string, string> = {
        'Enrollment not found': 'Inscrição não encontrada',
        'Enrollment is not active': 'Inscrição não está ativa',
        'New class not found': 'Novo grupo não encontrado',
        'New class inactive': 'Novo grupo está inativo',
        'New class full': 'Novo grupo está lotado',
        'você já concluiu esse PG Repense': 'você já concluiu esse PG Repense',
      };
      return NextResponse.json(
        { error: messages[error.message] || error.message },
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
