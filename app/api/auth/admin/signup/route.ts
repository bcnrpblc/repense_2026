import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const prisma = new PrismaClient()

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    
    // Validate input
    const { email, password } = signupSchema.parse(body)
    
    // Check if admin exists
    const existing = await prisma.admin.findUnique({
      where: { email }
    })
    
    if (existing) {
      return NextResponse.json(
        { error: 'Admin já existe' },
        { status: 409 }
      )
    }
    
    // Hash password
    const password_hash = await bcrypt.hash(password, 10)
    
    // Create admin
    const admin = await prisma.admin.create({
      data: {
        email,
        password_hash
      }
    })
    
    // Generate JWT (30 days expiration)
    const token = jwt.sign(
      { adminId: admin.id, email: admin.email },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    )
    
    return NextResponse.json({ token }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating admin:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}