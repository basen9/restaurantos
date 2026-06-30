export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { loadSettings } from '@/lib/settingsService'

// Status 2FA bieżącego użytkownika: czy włączone, czy wymuszone dla jego roli,
// ile pozostało nieużytych kodów odzyskiwania.
export const GET = handle(async () => {
  const user = await requireAuth()
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { twoFactorEnabled: true, twoFactorRecoveryCodes: true },
  })
  const settings = await loadSettings(user.organizationId)
  return NextResponse.json({
    enabled: !!dbUser?.twoFactorEnabled,
    enforced: settings.twoFactorRequiredRoles.includes(user.role),
    recoveryCodesLeft: dbUser?.twoFactorRecoveryCodes.length ?? 0,
  })
})
