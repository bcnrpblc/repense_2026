import { prisma } from '@/lib/prisma';

// ============================================================================
// TEACHER STATUS UTILITIES
// ============================================================================

/**
 * @deprecated This function is no longer used. Teacher `eh_ativo` status
 * is now manually controlled by admins and is independent of class assignment.
 * 
 * Previously synced teacher `eh_ativo` flag based on active, non-archived classes.
 * This behavior has been removed to separate access control from operational assignment.
 */
export async function syncTeachersActiveStatus(): Promise<{ activatedCount: number; deactivatedCount: number }> {
  // Function deprecated - no longer updates teacher status
  // Return empty result to maintain API compatibility if still called
  return { activatedCount: 0, deactivatedCount: 0 };
}

