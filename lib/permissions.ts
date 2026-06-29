// RBAC oparty na UPRAWNIENIACH, nie na nazwie roli.
// Dwie role: OWNER (wszystkie uprawnienia) i EMPLOYEE (uprawnienia bazowe + nadane).
// "Manager/Księgowa/Magazynier" istnieją wyłącznie jako zestawy uprawnień nadane pracownikowi.

export const PERMISSIONS = {
  VIEW_USERS: 'users.view',
  MANAGE_USERS: 'users.manage',
  MANAGE_SCHEDULE: 'schedule.manage',
  VIEW_ALL_SHIFTS: 'shifts.view_all',
  APPROVE_VACATIONS: 'vacations.approve',
  MANAGE_TASKS: 'tasks.manage',
  VIEW_ANALYTICS: 'analytics.view',
  VIEW_FINANCE: 'finance.view',
  MANAGE_INVENTORY: 'inventory.manage',
  MANAGE_PRODUCTS: 'products.manage',
  MANAGE_INCIDENTS: 'incidents.manage',
  VIEW_ALL_WASTE: 'waste.view_all',
  MANAGE_ORDERS: 'orders.manage', // zamykanie rachunków (tworzy sprzedaż)
  MANAGE_ORG: 'org.manage',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS)

// Pracownik nie ma domyślnie uprawnień zarządczych — operacje "na sobie"
// (własne zmiany, urlopy, zadania) są autoryzowane przez własność rekordu, nie uprawnienie.
export const EMPLOYEE_BASE_PERMISSIONS: Permission[] = []

// Predefiniowane pakiety uprawnień do nadawania pracownikom (przyszłość: UI nadawania).
export const PERMISSION_BUNDLES = {
  SHIFT_MANAGER: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_SCHEDULE,
    PERMISSIONS.VIEW_ALL_SHIFTS,
    PERMISSIONS.APPROVE_VACATIONS,
    PERMISSIONS.MANAGE_TASKS,
    PERMISSIONS.MANAGE_INCIDENTS,
    PERMISSIONS.VIEW_ALL_WASTE,
    PERMISSIONS.MANAGE_ORDERS,
  ],
  ACCOUNTANT: [PERMISSIONS.VIEW_ANALYTICS, PERMISSIONS.VIEW_FINANCE],
  STOCK_KEEPER: [PERMISSIONS.MANAGE_INVENTORY, PERMISSIONS.MANAGE_PRODUCTS],
  WAITER: [PERMISSIONS.MANAGE_ORDERS],
} satisfies Record<string, Permission[]>

export interface RbacUser {
  role: 'OWNER' | 'EMPLOYEE'
  permissions?: string[]
}

export function permissionsForUser(user: RbacUser): Permission[] {
  if (user.role === 'OWNER') return ALL_PERMISSIONS
  return [...EMPLOYEE_BASE_PERMISSIONS, ...((user.permissions || []) as Permission[])]
}

export function hasPermission(user: RbacUser, permission: Permission): boolean {
  if (user.role === 'OWNER') return true
  return (user.permissions || []).includes(permission)
}

export function isOwner(user: RbacUser): boolean {
  return user.role === 'OWNER'
}
