import { describe, it, expect } from 'vitest'
import { hasPermission, permissionsForUser, PERMISSIONS, ALL_PERMISSIONS } from '@/lib/permissions'

describe('RBAC permissions', () => {
  it('OWNER ma wszystkie uprawnienia', () => {
    const owner = { role: 'OWNER' as const }
    expect(hasPermission(owner, PERMISSIONS.APPROVE_VACATIONS)).toBe(true)
    expect(hasPermission(owner, PERMISSIONS.VIEW_FINANCE)).toBe(true)
    expect(permissionsForUser(owner)).toEqual(ALL_PERMISSIONS)
  })

  it('EMPLOYEE bez uprawnień nie ma dostępu zarządczego', () => {
    const emp = { role: 'EMPLOYEE' as const, permissions: [] }
    expect(hasPermission(emp, PERMISSIONS.APPROVE_VACATIONS)).toBe(false)
    expect(hasPermission(emp, PERMISSIONS.VIEW_USERS)).toBe(false)
  })

  it('EMPLOYEE z nadanym uprawnieniem ma tylko to uprawnienie', () => {
    const lead = { role: 'EMPLOYEE' as const, permissions: [PERMISSIONS.APPROVE_VACATIONS] }
    expect(hasPermission(lead, PERMISSIONS.APPROVE_VACATIONS)).toBe(true)
    expect(hasPermission(lead, PERMISSIONS.VIEW_FINANCE)).toBe(false)
  })
})
