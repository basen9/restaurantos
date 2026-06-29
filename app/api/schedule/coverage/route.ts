export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { getCoverage } from '@/lib/scheduleService'

export const GET = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_SCHEDULE)
  const { searchParams } = new URL(req.url)
  const ws = searchParams.get('weekStart')
  // domyślnie najbliższy poniedziałek
  const base = ws ? new Date(ws) : (() => { const d = new Date(); const day = d.getDay(); const diff = (day === 0 ? 1 : 8 - day); d.setDate(d.getDate() + diff); return d })()
  return NextResponse.json(await getCoverage(user.organizationId, base))
})
