export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS, ALL_PERMISSIONS } from '@/lib/permissions'
import { userUpdateSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_USERS)
  const data = parseBody(userUpdateSchema, await req.json())

  const target = await prisma.user.findFirst({ where: { id: params.id, ...orgScope(user) } })
  if (!target) throw new ApiError(404, 'User not found')
  if (target.role === 'OWNER') throw new ApiError(400, 'Nie można zmieniać uprawnień właściciela (ma pełny dostęp).')

  // Whitelista uprawnień (tylko znane).
  const permissions = data.permissions ? data.permissions.filter((p) => (ALL_PERMISSIONS as string[]).includes(p)) : undefined

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { ...(permissions ? { permissions } : {}), ...(data.position !== undefined ? { position: data.position } : {}) },
    select: { id: true, name: true, role: true, position: true, permissions: true },
  })
  await audit(user, 'user.permissions.update', 'User', updated.id, { permissions: updated.permissions })
  return NextResponse.json(updated)
})
