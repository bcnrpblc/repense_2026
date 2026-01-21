import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit, RateLimitConfigs } from '@/lib/rateLimit'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  rememberMe: z.boolean().optional().default(false)
})

export async function POST(request: NextRequest) {
  // Apply rate limiting (10 requests per minute)
  const rateLimitResult = rateLimit(request, RateLimitConfigs.auth);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    // Parse request body
    const body = await request.json()
    
    // Validate input
    const { email, password, rememberMe } = loginSchema.parse(body)
    
    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email }
    })
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, admin.password_hash)
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }
    
    // Generate JWT with expiration based on rememberMe
    // If rememberMe is true: 90 days, otherwise: 30 days
    const expiresIn = rememberMe ? '90d' : '30d';
    const token = jwt.sign(
      { adminId: admin.id, email: admin.email },
      process.env.JWT_SECRET!,
      { expiresIn }
    )
    
    return NextResponse.json({ token })
    
  } catch (error) {
    console.error('Error logging in admin:', error)
    
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