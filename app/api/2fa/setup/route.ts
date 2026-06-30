export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, ApiError } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { generateSecret, otpauthURL } from '@/lib/totp'

// Rozpoczyna enrollment 2FA: generuje sekret „pending" (jeszcze nieaktywny) i zwraca
// go wraz z otpauth:// URI do zeskanowania w aplikacji uwierzytelniającej.
// Aktywacja następuje dopiero po potwierdzeniu kodem w /api/2fa/enable.
export const POST = handle(async () => {
  const user = await requireAuth()
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { twoFactorEnabled: true, email: true, organization: { select: { name: true } } },
  })
  if (!dbUser) throw new ApiError(404, 'Nie znaleziono użytkownika')
  if (dbUser.twoFactorEnabled) throw new ApiError(409, '2FA jest już włączone. Najpierw je wyłącz.')

  const secret = generateSecret()
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorPendingSecret: secret } })
  const issuer = dbUser.organization?.name ? `RestaurantOS (${dbUser.organization.name})` : 'RestaurantOS'
  return NextResponse.json({ secret, otpauth: otpauthURL(secret, dbUser.email, issuer) })
})
