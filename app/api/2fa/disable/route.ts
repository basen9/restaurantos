export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { handle, requireAuth, parseBody, ApiError } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { verifyTOTP } from '@/lib/totp'
import { loadSettings } from '@/lib/settingsService'
import { audit } from '@/lib/audit'

const schema = z.object({ password: z.string().min(1), token: z.string().optional() })

// Wyłącza 2FA. Wymaga hasła + ważnego kodu TOTP (lub kodu odzyskiwania) — zapobiega
// wyłączeniu przez przejętą sesję. Jeśli rola użytkownika ma wymuszone 2FA przez
// właściciela (settings.twoFactorRequiredRoles), wyłączenie jest zablokowane.
export const POST = handle(async (req) => {
  const user = await requireAuth()
  const { password, token } = parseBody(schema, await req.json())

  const settings = await loadSettings(user.organizationId)
  if (settings.twoFactorRequiredRoles.includes(user.role)) {
    throw new ApiError(403, '2FA jest wymagane dla Twojej roli przez właściciela i nie może zostać wyłączone.')
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true, twoFactorEnabled: true, twoFactorSecret: true, twoFactorRecoveryCodes: true },
  })
  if (!dbUser?.twoFactorEnabled || !dbUser.twoFactorSecret) throw new ApiError(409, '2FA nie jest włączone.')
  if (!(await bcrypt.compare(password, dbUser.password))) throw new ApiError(403, 'Nieprawidłowe hasło.')

  // Drugi czynnik: kod TOTP albo jeden z jednorazowych kodów odzyskiwania.
  const codeOk = !!token && (
    verifyTOTP(dbUser.twoFactorSecret, token, Date.now()) ||
    (await anyRecoveryMatches(token, dbUser.twoFactorRecoveryCodes))
  )
  if (!codeOk) throw new ApiError(400, 'Podaj prawidłowy kod 2FA lub kod odzyskiwania.')

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorPendingSecret: null,
      twoFactorRecoveryCodes: [],
    },
  })
  await audit(user, '2fa.disable', 'User', user.id)
  return NextResponse.json({ ok: true })
})

async function anyRecoveryMatches(token: string, hashes: string[]): Promise<boolean> {
  for (const h of hashes) {
    if (await bcrypt.compare(token, h)) return true
  }
  return false
}
