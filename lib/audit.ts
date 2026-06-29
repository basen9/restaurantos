// Audyt zdarzeń wrażliwych (kto, co, kiedy) — wymóg dla approvali i operacji finansowych.
import { prisma } from './prisma'
import type { AuthUser } from './api'

export async function audit(
  user: Pick<AuthUser, 'id' | 'organizationId'>,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action,
        entityType,
        entityId,
        metadata: metadata as any,
      },
    })
  } catch (e) {
    // Audyt nie może wywrócić operacji biznesowej — logujemy i kontynuujemy.
    console.error('[AUDIT ERROR]', e)
  }
}
