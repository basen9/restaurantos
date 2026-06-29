export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { incidentDecisionSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_INCIDENTS)
  const { status, notes } = parseBody(incidentDecisionSchema, await req.json())

  const existing = await prisma.incident.findFirst({ where: { id: params.id, ...orgScope(user) } })
  if (!existing) throw new ApiError(404, 'Incident not found')

  const incident = await prisma.incident.update({
    where: { id: params.id },
    data: { status, notes: notes ?? existing.notes, resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : null },
  })
  await audit(user, `incident.${status.toLowerCase()}`, 'Incident', incident.id)
  return NextResponse.json(incident)
})
