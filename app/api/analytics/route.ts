export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, orgScope } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export const GET = handle(async () => {
  const user = await requirePermission(PERMISSIONS.VIEW_ANALYTICS)
  const org = orgScope(user)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalWaste, wasteThisMonth, openIncidents, pendingVacations, totalEmployees, tasksToday, wasteByProduct] =
    await Promise.all([
      prisma.wasteReport.aggregate({ where: org, _sum: { totalCost: true } }),
      prisma.wasteReport.aggregate({ where: { ...org, date: { gte: monthStart } }, _sum: { totalCost: true } }),
      prisma.incident.count({ where: { ...org, status: 'OPEN' } }),
      prisma.vacation.count({ where: { ...org, status: 'PENDING' } }),
      prisma.user.count({ where: { ...org, role: 'EMPLOYEE', isActive: true } }),
      prisma.task.count({ where: { ...org, status: { in: ['TODO', 'IN_PROGRESS'] } } }),
      prisma.wasteReport.groupBy({
        by: ['product'],
        where: org,
        _sum: { totalCost: true },
        orderBy: { _sum: { totalCost: 'desc' } },
        take: 5,
      }),
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
})