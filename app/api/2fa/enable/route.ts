export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { handle, requireAuth, parseBody, ApiError } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { verifyTOTP, generateRecoveryCodes } from '@/lib/totp'
import { audit } from '@/lib/audit'

const schema = z.object({ token: z.string().min(6).max(8) })

// Potwierdza enrollment: weryfikuje kod TOTP względem sekretu „pending".
// Po sukcesie aktywuje 2FA, zapisuje sekret bazowy i zwraca jednorazowe kody odzyskiwania
// (przechowywane jako skróty bcrypt — pokazywane użytkownikowi tylko raz).
export const POST = handle(async (req) => {
  const user = await requireAuth()
  const { token } = parseBody(schema, await req.json())
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { twoFactorPendingSecret: true, twoFactorEnabled: true },
  })
  if (!dbUser?.twoFactorPendingSecret) throw new ApiError(400, 'Brak rozpoczętej konfiguracji 2FA. Zacznij od nowa.')
  if (dbUser.twoFactorEnabled) throw new ApiError(409, '2FA jest już włączone.')
  if (!verifyTOTP(dbUser.twoFactorPendingSecret, token, Date.now())) {
    throw new ApiError(400, 'Nieprawidłowy kod. Sprawdź czas w telefonie i spróbuj ponownie.')
  }

  const recoveryCodes = generateRecoveryCodes(10)
  const hashed = await Promise.all(recoveryCodes.map((c) => bcrypt.hash(c, 10)))
  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: dbUser.twoFactorPendingSecret,
      twoFactorPendingSecret: null,
      twoFactorRecoveryCodes: hashed,
    },
  })
  await audit(user, '2fa.enable', 'User', user.id)
  return NextResponse.json({ ok: true, recoveryCodes })
})
