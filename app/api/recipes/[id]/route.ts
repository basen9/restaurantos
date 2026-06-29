export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { recipeGuideSchema } from '@/lib/validation'
import { canViewFullRecipe, type RecipeAccessLevel } from '@/lib/recipeAccess'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

// Pełny przepis kulinarny pojedynczej receptury — z egzekwowaniem dostępu.
export const GET = handle(async (_req, { params }: { params: { id: string } }) => {
  const user = await requireAuth()
  const recipe = await prisma.recipe.findFirst({
    where: { id: params.id, ...orgScope(user) },
    include: { product: { select: { name: true } }, accessUsers: { select: { userId: true } } },
  })
  if (!recipe) throw new ApiError(404, 'Receptura nie istnieje')
  const access = { fullRecipeAccess: recipe.fullRecipeAccess as RecipeAccessLevel, accessUserIds: recipe.accessUsers.map((a) => a.userId) }
  if (!canViewFullRecipe(user, access)) throw new ApiError(403, 'Brak dostępu do pełnego przepisu')
  return NextResponse.json(recipe)
})

// Edycja pełnego przepisu kulinarnego + ustawień dostępu (zarządzanie recepturami).
export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS)
  const data = parseBody(recipeGuideSchema, await req.json())

  const recipe = await prisma.recipe.findFirst({ where: { id: params.id, ...orgScope(user) }, select: { id: true } })
  if (!recipe) throw new ApiError(404, 'Receptura nie istnieje')

  // Walidacja, że wybrane osoby należą do organizacji.
  let accessIds: string[] | undefined
  if (data.accessUserIds) {
    const valid = await prisma.user.findMany({ where: { id: { in: data.accessUserIds }, ...orgScope(user) }, select: { id: true } })
    accessIds = valid.map((u) => u.id)
  }

  const { accessUserIds, ...fields } = data
  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.recipe.update({ where: { id: recipe.id }, data: fields })
    // Synchronizacja listy "wybranych osób" tylko gdy ją podano.
    if (accessIds) {
      await tx.recipeAccessUser.deleteMany({ where: { recipeId: recipe.id } })
      if (accessIds.length) await tx.recipeAccessUser.createMany({ data: accessIds.map((uid) => ({ recipeId: recipe.id, userId: uid })) })
    }
    return r
  })
  await audit(user, 'recipe.guide.update', 'Recipe', recipe.id, { fullRecipeAccess: updated.fullRecipeAccess })
  return NextResponse.json(updated)
})
