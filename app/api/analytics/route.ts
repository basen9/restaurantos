import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7)

  const [totalWaste, wasteThisMonth, openIncidents, pendingVacations, totalEmployees, tasksToday, wasteByProduct] = await Promise.all([
    prisma.wasteReport.aggregate({ _sum: { totalCost: true } }),
    prisma.wasteReport.aggregate({ where: { date: { gte: monthStart } }, _sum: { totalCost: true } }),
    prisma.incident.count({ where: { status: 'OPEN' } }),
    prisma.vacation.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { role: 'EMPLOYEE', isActive: true } }),
    prisma.task.count({ where: { status: { in: ['TODO', 'IN_PROGRESS'] } } }),
    prisma.wasteReport.groupBy({ by: ['product'], _sum: { totalCost: true }, orderBy: { _sum: { totalCost: 'desc' } }, take: 5 }),
  ])

  return NextResponse.json({
    totalWasteCost: totalWaste._sum.totalCost || 0,
    wasteThisMonth: wasteThisMonth._sum.totalCost || 0,
    openIncidents,
    pendingVacations,
    totalEmployees,
    tasksToday,
    wasteByProduct,
  })
}
