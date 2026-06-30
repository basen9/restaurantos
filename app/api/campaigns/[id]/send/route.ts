export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { matchesSegment, hasContactFor, mockSender, type Segment } from '@/lib/campaigns'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

// Wysyłka kampanii: rozwiązanie segmentu → adresaci z kontaktem dla kanału → dostawca (mock).
// Idempotentne: wysłana kampania nie wysyła ponownie.
export const POST = handle(async (_req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  const campaign = await prisma.campaign.findFirst({ where: { id: params.id, ...orgScope(user) } })
  if (!campaign) throw new ApiError(404, 'Kampania nie istnieje')
  if (campaign.status === 'SENT') return NextResponse.json(campaign)

  const segment = (campaign.segment || {}) as Segment
  const guests = await prisma.guest.findMany({ where: orgScope(user), select: { email: true, phone: true, tags: true, visits: true, birthday: true } })
  const channel = campaign.channel as 'EMAIL' | 'SMS' | 'PUSH'
  const audience = guests.filter((g) => matchesSegment(g, segment) && hasContactFor(g, channel))
  const recipients = audience.map((g) => ({ to: channel === 'EMAIL' ? g.email! : channel === 'SMS' ? g.phone! : 'push' }))

  const result = await mockSender.send(channel, recipients, { subject: campaign.subject ?? undefined, message: campaign.message })

  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: 'SENT', recipientCount: audience.length, sentCount: result.sent, provider: mockSender.name, sentAt: new Date() },
  })
  await audit(user, 'campaign.send', 'Campaign', campaign.id, { recipients: audience.length, channel, provider: mockSender.name })
  return NextResponse.json(updated)
})
