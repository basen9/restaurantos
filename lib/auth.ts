import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { rateLimit } from './ratelimit'
import { verifyTOTPStep } from './totp'

// Fail-fast: na produkcji odrzucamy brak / placeholder / zbyt krótki sekret JWT.
// Słaby sekret = możliwość podrobienia sesji. Pomijamy fazę builda (next build ustawia
// NODE_ENV=production, ale realny sekret produkcyjny bywa wstrzykiwany dopiero przy starcie).
const secret = process.env.NEXTAUTH_SECRET
if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
  if (!secret || secret.length < 32 || /change|example|placeholder|your-/i.test(secret)) {
    throw new Error('NEXTAUTH_SECRET jest nieustawiony, zbyt krótki lub to wartość przykładowa. Ustaw silny, losowy sekret (>=32 znaki).')
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        token: { label: '2FA', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        // Throttling logowania (per e-mail) — ogranicza brute-force / credential stuffing.
        // Najlepszy efekt po przeniesieniu do Redis (multi-instancja); in-memory = per-proces.
        if (!rateLimit(`login:${credentials.email.toLowerCase()}`, 10, 15 * 60 * 1000).ok) return null
        // E-mail normalizujemy do małych liter — spójnie z kluczem rate-limitu i z zapisem w bazie.
        const email = credentials.email.toLowerCase()
        const user = await prisma.user.findUnique({
          where: { email },
          include: { location: true, organization: true },
        })
        if (!user || !user.isActive) return null
        if (!user.organization?.isActive) return null
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        // Drugi składnik (TOTP) — tylko gdy użytkownik ma aktywne 2FA. Komunikaty
        // 2FA_REQUIRED / 2FA_INVALID są odczytywane na ekranie logowania (res.error),
        // by pokazać pole na kod lub błąd. Akceptujemy też jednorazowy kod odzyskiwania.
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          const token = (credentials.token || '').trim()
          if (!token) throw new Error('2FA_REQUIRED')

          // 1) TOTP: weryfikacja + ochrona przed replay. Krok musi być nowszy niż ostatnio
          //    zaakceptowany, a zapis jest atomowy (updateMany z warunkiem na lastStep),
          //    więc równoległe próby z tym samym kodem nie przejdą dwukrotnie.
          const step = verifyTOTPStep(user.twoFactorSecret, token, Date.now())
          if (step !== null) {
            if (BigInt(step) <= user.twoFactorLastStep) throw new Error('2FA_INVALID')
            const r = await prisma.user.updateMany({
              where: { id: user.id, twoFactorLastStep: { lt: BigInt(step) } },
              data: { twoFactorLastStep: BigInt(step) },
            })
            if (r.count === 0) throw new Error('2FA_INVALID') // wyścig: krok już zużyty
          } else {
            // 2) Kod odzyskiwania (jednorazowy). Znajdź pasujący skrót, a następnie usuń go
            //    atomowo — updateMany z warunkiem `has: matched` gwarantuje pojedyncze użycie
            //    nawet przy równoległych żądaniach (drugie nie spełni warunku WHERE).
            let matched: string | null = null
            for (const h of user.twoFactorRecoveryCodes) {
              if (await bcrypt.compare(token, h)) { matched = h; break }
            }
            if (!matched) throw new Error('2FA_INVALID')
            const remaining = user.twoFactorRecoveryCodes.filter((h) => h !== matched)
            const r = await prisma.user.updateMany({
              where: { id: user.id, twoFactorRecoveryCodes: { has: matched } },
              data: { twoFactorRecoveryCodes: { set: remaining } },
            })
            if (r.count === 0) throw new Error('2FA_INVALID') // wyścig: kod już zużyty
          }
        }
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          position: user.position,
          organizationId: user.organizationId,
          organizationName: user.organization?.name,
          locationId: user.locationId,
          locationName: user.location?.name,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
        token.permissions = (user as any).permissions
        token.position = (user as any).position
        token.organizationId = (user as any).organizationId
        token.organizationName = (user as any).organizationName
        token.locationId = (user as any).locationId
        token.locationName = (user as any).locationName
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as any
        u.id = token.id
        u.role = token.role
        u.permissions = token.permissions
        u.position = token.position
        u.organizationId = token.organizationId
        u.organizationName = token.organizationName
        u.locationId = token.locationId
        u.locationName = token.locationName
      }
      return session
    },
  },
  pages: { signIn: '/login' },
  // 8h sesja roboczej zmiany — ogranicza okno, w którym zmienione uprawnienia
  // pozostają nieaktywne do ponownego zalogowania (znana cecha JWT).
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
}
