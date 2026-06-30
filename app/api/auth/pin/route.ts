export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { handle, requireAuth, parseBody, ApiError } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { isValidPinFormat, hashPin, verifyPin } from '@/lib/deviceAuth'

const setSchema = z.object({ pin: z.string(), currentPin: z.string().optional() })

// Ustawienie / zmiana PIN-u szybkiego logowania. Zmiana wymaga podania aktualnego PIN-u.
export const POST = handle(async (req) => {
  const user = await requireAuth()
  const { pin, currentPin } = parseBody(setSchema, await req.json())
  if (!isValidPinFormat(pin)) throw new ApiError(400, 'PIN musi mieć 4–6 cyfr.')

  const existing = await prisma.authCredential.findFirst({ where: { userId: user.id, type: 'PIN' } })
  if (existing) {
    if (!currentPin || !existing.secret || !(await verifyPin(currentPin, existing.secret))) {
      throw new ApiError(403, 'Nieprawidłowy obecny PIN.')
    }
    await prisma.authCredential.update({ where: { id: existing.id }, data: { secret: await hashPin(pin), failedAttempts: 0, lockedUntil: null } })
  } else {
    await prisma.authCredential.create({
      data: { organizationId: user.organizationId, userId: user.id, type: 'PIN', secret: await hashPin(pin), label: 'PIN' },
    })
  }
  await audit(user, existing ? 'pin.change' : 'pin.set', 'User', user.id)
  return NextResponse.json({ ok: true })
})

// Usunięcie PIN-u (powrót do logowania hasłem na tym urządzeniu).
export const DELETE = handle(async () => {
  const user = await requireAuth()
  await prisma.authCredential.deleteMany({ where: { userId: user.id, type: 'PIN' } })
  await audit(user, 'pin.remove', 'User', user.id)
  return NextResponse.json({ ok: true })
})
