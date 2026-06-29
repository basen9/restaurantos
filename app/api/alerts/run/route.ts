export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, enforceRateLimit } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { runAlerts } from '@/lib/alertsEngine'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

// Uruchamia silnik alertów. Dwa tryby:
//  - cron: nagłówek x-cron-secret == CRON_SECRET → przebiega po wszystkich organizacjach,
//  - interaktywny: właściciel (org.manage) → tylko jego organizacja.
export const POST = handle(async (req) => {
  const cronSecret = process.env.CRON_SECRET
  const provided = req.headers.get('x-cron-secret')

  if (cronSecret && provided && provided === cronSecret) {
    const orgs = await prisma.organization.findMany({ where: { isActive: true }, select: { id: true } })
    let total = 0
    for (const o of orgs) {
      const r = await runAlerts({ id: 'system', organizationId: o.id })
      total += r.created
    }
    return NextResponse.json({ ok: true, organizations: orgs.length, created: total })
  }

  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  enforceRateLimit(`alerts-run:${user.organizationId}`, 12, 60 * 60 * 1000)
  const result = await runAlerts(user)
  await audit(user, 'alerts.run', 'Alert', undefined, result)
  return NextResponse.json(result)
})
