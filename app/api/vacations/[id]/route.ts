import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const vac = await prisma.vacation.update({
    where: { id: params.id },
    data: { ...body, approvedBy: (session.user as any).id, approvedAt: new Date() },
    include: { user: true }
  })
  await prisma.notification.create({
    data: {
      userId: vac.userId, type: body.status === 'APPROVED' ? 'SUCCESS' : 'WARNING',
      title: body.status === 'APPROVED' ? 'Urlop zaakceptowany ✅' : 'Urlop odrzucony ❌',
      body: body.status === 'APPROVED' ? `Twój wniosek urlopowy został zaakceptowany.` : `Twój wniosek urlopowy został odrzucony. Powód: ${body.reason || 'Brak podanego powodu.'}`
    }
  })
  return NextResponse.json(vac)
}
