export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { sopUpdateSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  const data = parseBody(sopUpdateSchema, await req.json())
  const existing = await prisma.sopDocument.findFirst({ where: { id: params.id, ...orgScope(user) }, select: { id: true } })
  if (!existing) throw new ApiError(404, 'SOP not found')
  const doc = await prisma.sopDocument.update({ where: { id: params.id }, data })
  await audit(user, 'sop.update', 'SopDocument', doc.id)
  return NextResponse.json(doc)
})

export const DELETE = handle(async (_req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  const existing = await prisma.sopDocument.findFirst({ where: { id: params.id, ...orgScope(user) }, select: { id: true } })
  if (!existing) throw new ApiError(404, 'SOP not found')
  await prisma.sopDocument.update({ where: { id: params.id }, data: { isActive: false } })
  await audit(user, 'sop.delete', 'SopDocument', params.id)
  return NextResponse.json({ ok: true })
})
