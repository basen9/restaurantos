export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, requirePermission, parseBody, orgScope } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { sopSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const GET = handle(async () => {
  const user = await requireAuth()
  const docs = await prisma.sopDocument.findMany({
    where: { ...orgScope(user), isActive: true },
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
  })
  return NextResponse.json(docs)
})

export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  const data = parseBody(sopSchema, await req.json())
  const doc = await prisma.sopDocument.create({ data: { organizationId: user.organizationId, ...data } })
  await audit(user, 'sop.create', 'SopDocument', doc.id, { title: doc.title })
  return NextResponse.json(doc, { status: 201 })
})
