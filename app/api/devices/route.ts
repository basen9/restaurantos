export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { handle, requireAuth, parseBody, orgScope } from '@/lib/api'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import {
  generateDeviceToken, hashDeviceToken, DEVICE_COOKIE_ID, DEVICE_COOKIE_TOKEN, DEVICE_TRUST_MAX_AGE_S,
} from '@/lib/deviceAuth'

// Lista zaufanych urządzeń. Manager (org.manage) widzi wszystkie w organizacji;
// pozostali — własne + współdzielone. Oznaczamy bieżące urządzenie.
export const GET = handle(async () => {
  const user = await requireAuth()
  const currentId = cookies().get(DEVICE_COOKIE_ID)?.value
  const isManager = hasPermission(user, PERMISSIONS.MANAGE_ORG)
  const where: any = { ...orgScope(user), revokedAt: null }
  if (!isManager) where.OR = [{ userId: user.id }, { shared: true }]
  const devices = await prisma.trustedDevice.findMany({ where, orderBy: { lastSeenAt: 'desc' } })
  return NextResponse.json(devices.map((d) => ({
    id: d.id, name: d.name, shared: d.shared, locationId: d.locationId,
    lastSeenAt: d.lastSeenAt, trustedAt: d.trustedAt, current: d.id === currentId,
  })))
})

const trustSchema = z.object({ name: z.string().max(80).optional(), shared: z.boolean().optional() })

// „Zaufaj temu urządzeniu" po pełnym logowaniu. Tworzy rekord + ustawia httpOnly cookie
// z sekretem urządzenia. Urządzenie współdzielone (terminal POS) może utworzyć tylko manager.
export const POST = handle(async (req) => {
  const user = await requireAuth()
  const { name, shared } = parseBody(trustSchema, await req.json().catch(() => ({})))
  const isShared = !!shared && hasPermission(user, PERMISSIONS.MANAGE_ORG)
  const token = generateDeviceToken()
  const device = await prisma.trustedDevice.create({
    data: {
      organizationId: user.organizationId,
      userId: isShared ? null : user.id,
      locationId: user.locationId,
      name: name || (isShared ? 'Terminal współdzielony' : 'Moje urządzenie'),
      shared: isShared,
      tokenHash: hashDeviceToken(token),
    },
  })
  await audit(user, 'device.trust', 'TrustedDevice', device.id, { shared: isShared })
  const res = NextResponse.json({ id: device.id, shared: device.shared })
  const opts = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: DEVICE_TRUST_MAX_AGE_S }
  res.cookies.set(DEVICE_COOKIE_ID, device.id, opts)
  res.cookies.set(DEVICE_COOKIE_TOKEN, token, opts)
  return res
})
