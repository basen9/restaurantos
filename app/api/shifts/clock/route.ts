import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { action, shiftId } = await req.json()
  const userId = (session.user as any).id

  if (action === 'start') {
    // Find today's scheduled shift or create one
    let shift = shiftId
      ? await prisma.shift.findUnique({ where: { id: shiftId } })
      : await prisma.shift.findFirst({
          where: { userId, status: 'SCHEDULED', date: { gte: new Date(new Date().setHours(0,0,0,0)) } },
          orderBy: { date: 'asc' }
        })
    if (!shift) {
      // Create ad-hoc shift
      const loc = await prisma.location.findFirst()
      shift = await prisma.shift.create({
        data: { userId, locationId: loc!.id, date: new Date(), startTime: new Date().toTimeString().slice(0,5), endTime: '23:59', status: 'ACTIVE', actualStart: new Date() }
      })
    } else {
      shift = await prisma.shift.update({ where: { id: shift.id }, data: { status: 'ACTIVE', actualStart: new Date() } })
    }
    // Notify manager
    const managers = await prisma.user.findMany({ where: { role: { in: ['MANAGER', 'OWNER'] } } })
    const user = await prisma.user.findUnique({ where: { id: userId } })
    await prisma.notification.createMany({ data: managers.map(m => ({ userId: m.id, title: `${user?.name} rozpoczął(a) zmianę`, body: `Zmiana rozpoczęta o ${new Date().toLocaleTimeString('pl-PL', {hour:'2-digit',minute:'2-digit'})}`, type: 'INFO' })) })
    return NextResponse.json(shift)
  }

  if (action === 'end') {
    const shift = await prisma.shift.findFirst({ where: { userId, status: 'ACTIVE' } })
    if (!shift) return NextResponse.json({ error: 'No active shift' }, { status: 404 })
    const updated = await prisma.shift.update({ where: { id: shift.id }, data: { status: 'COMPLETED', actualEnd: new Date() } })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
