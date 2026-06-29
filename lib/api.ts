// Wspólna warstwa API: autoryzacja, RBAC, walidacja (Zod), obsługa błędów, izolacja tenanta.
// Każdy endpoint przechodzi: handle() → requireAuth/requirePermission → parseBody → orgScope.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { hasPermission, type Permission } from './permissions'
import type { ZodSchema } from 'zod'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export interface AuthUser {
  id: string
  organizationId: string
  role: 'OWNER' | 'EMPLOYEE'
  permissions: string[]
  name: string
  email: string
  locationId: string | null
}

export async function requireAuth(): Promise<AuthUser> {
  const session = await getServerSession(authOptions)
  const u = session?.user as any
  if (!u?.id || !u?.organizationId) throw new ApiError(401, 'Unauthorized')
  return {
    id: u.id,
    organizationId: u.organizationId,
    role: u.role,
    permissions: u.permissions || [],
    name: u.name,
    email: u.email,
    locationId: u.locationId ?? null,
  }
}

export async function requirePermission(permission: Permission): Promise<AuthUser> {
  const user = await requireAuth()
  if (!hasPermission(user, permission)) throw new ApiError(403, 'Forbidden')
  return user
}

// Walidacja + whitelista pól (koniec mass-assignment przez ...body).
export function parseBody<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ')
    throw new ApiError(400, `Validation failed: ${msg}`)
  }
  return result.data
}

// Filtr izolacji tenanta — wszystkie zapytania muszą być zawężone do organizacji.
export function orgScope(user: AuthUser) {
  return { organizationId: user.organizationId }
}

type Handler = (req: Request, ctx: any) => Promise<Response> | Response

export function handle(fn: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx)
    } catch (e) {
      if (e instanceof ApiError) {
        return NextResponse.json({ error: e.message }, { status: e.status })
      }
      console.error('[API ERROR]', e)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
