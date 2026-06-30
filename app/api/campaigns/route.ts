export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, orgScope } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { campaignSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const GET = handle(async () => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  const campaigns = await prisma.campaign.findMany({ where: orgScope(user), orderBy: { createdAt: 'desc' }, take: 100 })
  return NextResponse.json(campaigns)
})

export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  const data = parseBody(campaignSchema, await req.json())
  const campaign = await prisma.campaign.create({ data: { organizationId: user.organizationId, name: data.name, channel: data.channel, segment: data.segment as any, subject: data.subject, message: data.message, createdById: user.id } })
  await audit(user, 'campaign.create', 'Campaign', campaign.id, { channel: campaign.channel })
  return NextResponse.json(campaign, { status: 201 })
})
