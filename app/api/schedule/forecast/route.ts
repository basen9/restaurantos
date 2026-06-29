export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { getForecast } from '@/lib/scheduleService'

export const GET = handle(async () => {
  const user = await requirePermission(PERMISSIONS.MANAGE_SCHEDULE)
  return NextResponse.json(await getForecast(user.organizationId))
})
