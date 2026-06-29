// Kontrola dostępu do PEŁNEGO przepisu kulinarnego (oddzielona od receptury magazynowej).
// Pure → testowalne. Edycja przepisów wymaga MANAGE_PRODUCTS; tutaj decydujemy o ODCZYCIE.
import { PERMISSIONS, type RbacUser } from './permissions'

export type RecipeAccessLevel = 'OWNER_ONLY' | 'OWNER_MANAGER' | 'ALL_COOKS' | 'SELECTED'

// "Manager" = pracownik z podwyższonymi uprawnieniami (kierownik/szef kuchni).
function isManagerish(user: RbacUser): boolean {
  if (user.role === 'OWNER') return true
  const p = user.permissions || []
  return [PERMISSIONS.MANAGE_SCHEDULE, PERMISSIONS.MANAGE_PRODUCTS, PERMISSIONS.MANAGE_TASKS, PERMISSIONS.VIEW_ALL_SHIFTS].some((x) => p.includes(x))
}

// Czy użytkownik może zobaczyć pełny przepis kulinarny danej receptury.
export function canViewFullRecipe(
  user: RbacUser & { id?: string },
  recipe: { fullRecipeAccess: RecipeAccessLevel; accessUserIds?: string[] },
): boolean {
  if (user.role === 'OWNER') return true // właściciel ma pełny dostęp zawsze
  switch (recipe.fullRecipeAccess) {
    case 'OWNER_ONLY':
      return false
    case 'OWNER_MANAGER':
      return isManagerish(user)
    case 'ALL_COOKS':
      return true // każdy pracownik (kucharz)
    case 'SELECTED':
      return !!user.id && (recipe.accessUserIds || []).includes(user.id)
    default:
      return false
  }
}
