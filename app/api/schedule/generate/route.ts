export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, ApiError, enforceRateLimit } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { scheduleGenerateSchema } from '@/lib/validation'
import { generateWeek } from '@/lib/scheduleService'
import { audit } from '@/lib/audit'

export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_SCHEDULE)
  enforceRateLimit(`schedule:${user.organizationId}`, 20, 60 * 60 * 1000)
  const { weekStart } = parseBody(scheduleGenerateSchema, await req.json())
  try {
    const result = await generateWeek(user, weekStart)
    await audit(user, 'schedule.generate', 'Schedule', result.scheduleId, { weekStart: result.weekStart, totalShifts: result.totalShifts })
    return NextResponse.json(result, { status: 201 })
  } catch (e: any) {
    throw new ApiError(400, e.message || 'Nie udało się wygenerować grafiku')
  }
})
