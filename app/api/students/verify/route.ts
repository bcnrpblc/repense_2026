import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cleanCPF } from '@/lib/utils/cpf';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { cpf } = body;

    // Validate required fields
    if (!cpf) {
      return NextResponse.json(
        { error: 'CPF é obrigatório' },
        { status: 400 }
      );
    }

    // Clean CPF
    const cleanedCPF = cleanCPF(cpf);

    // Find student by CPF only
    const student = await prisma.student.findFirst({
      where: {
        cpf: cleanedCPF,
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Cadastro não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      student_id: student.id,
    });
  } catch (error: any) {
    console.error('Error verifying student:', error);
    
    return NextResponse.json(
      { error: 'Erro ao verificar cadastro' },
      { status: 500 }
    );
  }
}
