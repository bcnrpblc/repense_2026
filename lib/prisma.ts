import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Verify NotificationRead model exists (for debugging)
if (process.env.NODE_ENV === 'development' && !('notificationRead' in prisma)) {
  console.warn('[PRISMA] Warning: notificationRead model not found in Prisma Client. Please restart the server after running: npx prisma generate');
}
