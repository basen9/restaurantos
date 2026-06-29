import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: 'OWNER' | 'EMPLOYEE'
      permissions: string[]
      position?: string | null
      organizationId: string
      organizationName?: string | null
      locationId?: string | null
      locationName?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'OWNER' | 'EMPLOYEE'
    permissions: string[]
    position?: string | null
    organizationId: string
    organizationName?: string | null
    locationId?: string | null
    locationName?: string | null
  }
}
