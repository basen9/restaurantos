export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, parseBody, orgScope, ApiError } from '@/lib/api'
import { clockSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

// Aktualny stan zmiany (trwały — źródłem prawdy jest baza, nie stan komponentu).
export const GET = handle(async () => {
  const user = await requireAuth()
  const shift = await prisma.shift.findFirst({
    where: { ...orgScope(user), userId: user.id, status: 'ACTIVE' },
    orderBy: { actualStart: 'desc' },
  })
  return NextResponse.json({ active: !!shift, shift })
})

export const POST = handle(async (req) => {
  const user = await requireAuth()
  const { action, shiftId } = parseBody(clockSchema, await req.json())

  if (action === 'start') {
    // Transakcja + guard: zapobiega utworzeniu dwóch równoległych zmian ACTIVE
    // (podwójny klik / retry), co podwajałoby koszt pracy w analityce.
    const shift = await prisma.$transaction(async (tx) => {
      const alreadyActive = await tx.shift.findFirst({ where: { ...orgScope(user), userId: user.id, status: 'ACTIVE' }, orderBy: { actualStart: 'desc' } })
      if (alreadyActive) return alreadyActive // idempotentnie zwracamy istniejącą zmianę

      const target = shiftId
        ? await tx.shift.findFirst({ where: { id: shiftId, ...orgScope(user), userId: user.id } })
        : await tx.shift.findFirst({
            where: { ...orgScope(user), userId: user.id, status: 'SCHEDULED', date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
            orderBy: { date: 'asc' },
          })

      if (shiftId && !target) throw new ApiError(404, 'Shift not found')

      if (!target) {
        const loc = await tx.location.findFirst({ where: orgScope(user) })
        if (!loc) throw new ApiError(400, 'No location configured')
        return tx.shift.create({
          data: {
            organizationId: user.organizationId,
            userId: user.id,
            locationId: user.locationId ?? loc.id,
            date: new Date(),
            startTime: new Date().toTimeString().slice(0, 5),
            endTime: '23:59',
            status: 'ACTIVE',
            actualStart: new Date(),
          },
        })
      }
      return tx.shift.update({ where: { id: target.id }, data: { status: 'ACTIVE', actualStart: new Date() } })
    })
    return NextResponse.json(shift)
  }

  // action === 'end'
  const active = await prisma.shift.findFirst({ where: { ...orgScope(user), userId: user.id, status: 'ACTIVE' } })
  if (!active) throw new ApiError(404, 'No active shift')
  const updated = await prisma.shift.update({ where: { id: active.id }, data: { status: 'COMPLETED', actualEnd: new Date() } })
  return NextResponse.json(updated)
})