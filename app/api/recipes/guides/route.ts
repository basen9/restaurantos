export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, orgScope } from '@/lib/api'
import { canViewFullRecipe, type RecipeAccessLevel } from '@/lib/recipeAccess'
import { prisma } from '@/lib/prisma'

// Lista pełnych przepisów kulinarnych widocznych dla zalogowanego użytkownika (kucharza).
// Zwracamy tylko receptury, do których ma dostęp wg fullRecipeAccess.
export const GET = handle(async () => {
  const user = await requireAuth()
  const recipes = await prisma.recipe.findMany({
    where: orgScope(user),
    include: { product: { select: { name: true } }, accessUsers: { select: { userId: true } } },
    orderBy: { updatedAt: 'desc' },
  })
  const visible = recipes
    .filter((r) => canViewFullRecipe(user, { fullRecipeAccess: r.fullRecipeAccess as RecipeAccessLevel, accessUserIds: r.accessUsers.map((a) => a.userId) }))
    .map((r) => ({
      id: r.id,
      product: r.product,
      instructions: r.instructions,
      prepTimeMin: r.prepTimeMin,
      chefTips: r.chefTips,
      cookNotes: r.cookNotes,
      allergens: r.allergens,
      photos: r.photos,
    }))
  return NextResponse.json(visible)
})
