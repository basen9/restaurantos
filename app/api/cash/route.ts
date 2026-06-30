export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { getOpenSession, recentSessions } from '@/lib/cashService'

// Stan kasy: otwarta zmiana (z wyliczoną oczekiwaną gotówką) + historia.
export const GET = handle(async () => {
  const user = await requirePermission(PERMISSIONS.MANAGE_CASH)
  const [open, history] = await Promise.all([getOpenSession(user), recentSessions(user)])
  return NextResponse.json({ open, history })
})
