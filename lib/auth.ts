import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { location: true, organization: true },
        })
        if (!user || !user.isActive) return null
        if (!user.organization?.isActive) return null
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null
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
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}
