import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cleanCPF } from '@/lib/utils/cpf';
import { cleanPhone } from '@/lib/utils/phone';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { telefone, cpf } = body;

    // Validate required fields
    if (!telefone || !cpf) {
      return NextResponse.json(
        { error: 'Telefone e CPF são obrigatórios' },
        { status: 400 }
      );
    }

    // Clean CPF and phone
    const cleanedCPF = cleanCPF(cpf);
    const cleanedPhone = cleanPhone(telefone);

    // Find student by CPF and phone
    const student = await prisma.student.findFirst({
      where: {
        cpf: cleanedCPF,
        telefone: cleanedPhone,
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
