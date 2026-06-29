import { describe, it, expect } from 'vitest'
import { canViewFullRecipe } from '@/lib/recipeAccess'

const owner = { role: 'OWNER' as const, permissions: [], id: 'o1' }
const cook = { role: 'EMPLOYEE' as const, permissions: [], id: 'c1' }
const manager = { role: 'EMPLOYEE' as const, permissions: ['schedule.manage'], id: 'm1' }

describe('canViewFullRecipe', () => {
  it('właściciel widzi zawsze', () => {
    expect(canViewFullRecipe(owner, { fullRecipeAccess: 'OWNER_ONLY' })).toBe(true)
  })
  it('OWNER_ONLY ukrywa przed pracownikiem', () => {
    expect(canViewFullRecipe(cook, { fullRecipeAccess: 'OWNER_ONLY' })).toBe(false)
  })
  it('OWNER_MANAGER: manager tak, zwykły kucharz nie', () => {
    expect(canViewFullRecipe(manager, { fullRecipeAccess: 'OWNER_MANAGER' })).toBe(true)
    expect(canViewFullRecipe(cook, { fullRecipeAccess: 'OWNER_MANAGER' })).toBe(false)
  })
  it('ALL_COOKS: każdy pracownik widzi', () => {
    expect(canViewFullRecipe(cook, { fullRecipeAccess: 'ALL_COOKS' })).toBe(true)
  })
  it('SELECTED: tylko osoby z listy', () => {
    expect(canViewFullRecipe(cook, { fullRecipeAccess: 'SELECTED', accessUserIds: ['c1'] })).toBe(true)
    expect(canViewFullRecipe(cook, { fullRecipeAccess: 'SELECTED', accessUserIds: ['x'] })).toBe(false)
  })
})
