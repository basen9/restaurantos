import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { vacationDecisionSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.APPROVE_VACATIONS)
  const { status, reason } = parseBody(vacationDecisionSchema, await req.json())

  // Wniosek musi należeć do tej samej organizacji.
  const existing = await prisma.vacation.findFirst({ where: { id: params.id, ...orgScope(user) } })
  if (!existing) throw new ApiError(404, 'Vacation not found')

  const vac = await prisma.vacation.update({
    where: { id: params.id },
    data: { status, reason: reason ?? existing.reason, approvedBy: user.id, approvedAt: new Date() },
    include: { user: true },
  })

  await audit(user, `vacation.${status.toLowerCase()}`, 'Vacation', vac.id, { targetUserId: vac.userId, reason })

  await prisma.notification.create({
    data: {
      organizationId: user.organizationId,
      userId: vac.userId,
      type: status === 'APPROVED' ? 'SUCCESS' : 'WARNING',
      title: status === 'APPROVED' ? 'Urlop zaakceptowany ✅' : 'Urlop odrzucony ❌',
      body:
        status === 'APPROVED'
          ? 'Twój wniosek urlopowy został zaakceptowany.'
          : `Twój wniosek urlopowy został odrzucony. Powód: ${reason || 'Brak podanego powodu.'}`,
    },
  })
  return NextResponse.json(vac)
})
