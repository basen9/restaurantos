export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, orgScope } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { computePayroll } from '@/lib/payroll'
import { prisma } from '@/lib/prisma'

// Raport płac: godziny i wynagrodzenie brutto per pracownik w okresie.
export const GET = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.VIEW_FINANCE)
  const sp = new URL(req.url).searchParams
  const from = sp.get('from') ? new Date(sp.get('from')!) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const to = sp.get('to') ? new Date(sp.get('to')!) : new Date()
  const shifts = await prisma.shift.findMany({
    where: { ...orgScope(user), status: 'COMPLETED', date: { gte: from, lte: to } },
    select: { actualStart: true, actualEnd: true, status: true, startTime: true, endTime: true, userId: true, user: { select: { name: true, hourlyRate: true } } },
    take: 50000,
  })
  const rows = computePayroll(shifts.map((s) => ({ userId: s.userId, userName: s.user?.name || '—', hourlyRate: s.user?.hourlyRate || 0, actualStart: s.actualStart, actualEnd: s.actualEnd, status: s.status, startTime: s.startTime, endTime: s.endTime })))
  const totals = { hours: Math.round(rows.reduce((a, r) => a + r.hours, 0) * 100) / 100, gross: Math.round(rows.reduce((a, r) => a + r.gross, 0) * 100) / 100 }
  return NextResponse.json({ from, to, rows, totals })
})
