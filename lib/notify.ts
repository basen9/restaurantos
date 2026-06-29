// Odbiorcy powiadomień zarządczych = OWNER + pracownicy z danym uprawnieniem (w obrębie tenanta).
import { prisma } from './prisma'
import type { Permission } from './permissions'

export async function recipientsWithPermission(organizationId: string, permission: Permission) {
  return prisma.user.findMany({
    where: {
      organizationId,
      isActive: true,
      OR: [{ role: 'OWNER' }, { permissions: { has: permission } }],
    },
    select: { id: true },
  })
}
