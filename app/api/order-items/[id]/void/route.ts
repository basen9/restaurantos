export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, parseBody, ApiError } from '@/lib/api'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { voidItemSchema } from '@/lib/validation'
import { loadSettings } from '@/lib/settingsService'
import { voidItem } from '@/lib/orderService'

// Storno pozycji. Polityka konfigurowalna: voidRequiresManager (ustawienia).
export const POST = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requireAuth()
  const { reason } = parseBody(voidItemSchema, await req.json())
  const settings = await loadSettings(user.organizationId)
  if (settings.voidRequiresManager && !hasPermission(user, PERMISSIONS.MANAGE_ORDERS)) {
    throw new ApiError(403, 'Storno wymaga uprawnienia managera')
  }
  const item = await voidItem(user, params.id, reason)
  return NextResponse.json(item)
})
