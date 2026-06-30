export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, requirePermission, parseBody } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { settingsSchema } from '@/lib/validation'
import { mergeSettings } from '@/lib/settings'
import { loadSettings } from '@/lib/settingsService'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

// Bieżące ustawienia (scalone z domyślnymi) — czytelne dla każdego zalogowanego.
export const GET = handle(async () => {
  const user = await requireAuth()
  return NextResponse.json(await loadSettings(user.organizationId))
})

// Zmiana ustawień — tylko właściciel (org.manage). Whitelist pól + scalenie.
export const PATCH = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  const patch = parseBody(settingsSchema, await req.json())
  const current = await loadSettings(user.organizationId)
  const merged = mergeSettings({ ...current, ...patch })
  await prisma.organization.update({ where: { id: user.organizationId }, data: { settings: merged as any } })
  await audit(user, 'settings.update', 'Organization', user.organizationId, patch)
  return NextResponse.json(merged)
})
