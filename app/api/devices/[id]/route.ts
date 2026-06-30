export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { handle, requireAuth, orgScope, ApiError } from '@/lib/api'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { DEVICE_COOKIE_ID, DEVICE_COOKIE_TOKEN } from '@/lib/deviceAuth'

// Odwołanie zaufania urządzenia. Właściciel urządzenia lub manager (org.manage).
// Odwołanie bieżącego urządzenia czyści też cookie (natychmiastowe wylogowanie sprzętu).
export const DELETE = handle(async (_req, { params }) => {
  const user = await requireAuth()
  const device = await prisma.trustedDevice.findFirst({ where: { id: params.id, ...orgScope(user) } })
  if (!device) throw new ApiError(404, 'Nie znaleziono urządzenia')
  const isManager = hasPermission(user, PERMISSIONS.MANAGE_ORG)
  if (!isManager && device.userId !== user.id) throw new ApiError(403, 'Brak uprawnień do tego urządzenia')

  await prisma.trustedDevice.update({ where: { id: device.id }, data: { revokedAt: new Date() } })
  await audit(user, 'device.revoke', 'TrustedDevice', device.id)

  const res = NextResponse.json({ ok: true })
  if (cookies().get(DEVICE_COOKIE_ID)?.value === device.id) {
    res.cookies.set(DEVICE_COOKIE_ID, '', { path: '/', maxAge: 0 })
    res.cookies.set(DEVICE_COOKIE_TOKEN, '', { path: '/', maxAge: 0 })
  }
  return res
})
