import { NextResponse } from 'next/server'
import { handle, requireAuth, parseBody, orgScope, ApiError } from '@/lib/api'
import { checklistRunSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export const POST = handle(async (req) => {
  const user = await requireAuth()
  const { templateId, completions } = parseBody(checklistRunSchema, await req.json())

  // Szablon musi należeć do tej samej organizacji.
  const template = await prisma.checklistTemplate.findFirst({
    where: { id: templateId, ...orgScope(user) },
    include: { items: { select: { id: true } } },
  })
  if (!template) throw new ApiError(404, 'Checklist template not found')

  const validItemIds = new Set(template.items.map((i) => i.id))
  const safeCompletions = completions.filter((c) => validItemIds.has(c.itemId))

  const run = await prisma.checklistRun.create({
    data: {
      organizationId: user.organizationId,
      templateId,
      userId: user.id,
      status: 'SUBMITTED',
      completedAt: new Date(),
      completions: {
        create: safeCompletions.map((c) => ({ itemId: c.itemId, done: c.done, doneAt: c.done ? new Date() : null })),
      },
    },
    include: { completions: true },
  })
  return NextResponse.json(run, { status: 201 })
})
