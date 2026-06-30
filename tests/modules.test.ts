import { describe, it, expect } from 'vitest'
import { canAccessModule, modulesForUser } from '@/lib/modules'
import { PERMISSIONS } from '@/lib/permissions'

const owner = { role: 'OWNER' as const }
const waiter = { role: 'EMPLOYEE' as const, permissions: [PERMISSIONS.MANAGE_ORDERS] }
const cook = { role: 'EMPLOYEE' as const, permissions: [] }
const manager = { role: 'EMPLOYEE' as const, permissions: [PERMISSIONS.VIEW_ANALYTICS, PERMISSIONS.MANAGE_SCHEDULE] }

describe('module access', () => {
  it('owner sees every module', () => {
    expect(modulesForUser(owner).map((m) => m.key).sort()).toEqual(['employee', 'kitchen', 'manager', 'pos'])
  })
  it('waiter gets POS + kitchen + employee, not manager', () => {
    expect(canAccessModule(waiter, 'pos')).toBe(true)
    expect(canAccessModule(waiter, 'manager')).toBe(false)
    expect(canAccessModule(waiter, 'kitchen')).toBe(true)
    expect(canAccessModule(waiter, 'employee')).toBe(true)
  })
  it('plain cook has no POS or manager, but kitchen + employee', () => {
    expect(canAccessModule(cook, 'pos')).toBe(false)
    expect(canAccessModule(cook, 'manager')).toBe(false)
    expect(canAccessModule(cook, 'kitchen')).toBe(true)
    expect(canAccessModule(cook, 'employee')).toBe(true)
  })
  it('employee with manager-bundle perms sees manager', () => {
    expect(canAccessModule(manager, 'manager')).toBe(true)
  })
})
