// Launcher modułów jednej platformy RestaurantOS. Każdy moduł ma własny shell/UX,
// ale wszystkie korzystają ze wspólnego backendu. Tu decydujemy, KTO widzi KTÓRY moduł.
import { PERMISSIONS, hasPermission, isOwner, type RbacUser } from './permissions'

export type ModuleKey = 'manager' | 'pos' | 'kitchen' | 'employee'

export interface PlatformModule {
  key: ModuleKey
  label: string
  description: string
  href: string // punkt wejścia modułu (docelowo własny route-group)
  accent: string
}

// Kolejność = priorytet wyświetlania w launcherze.
export const MODULES: PlatformModule[] = [
  { key: 'pos', label: 'POS', description: 'Sprzedaż przy stoliku — najszybsza obsługa', href: '/floor', accent: '#E8B923' },
  { key: 'kitchen', label: 'Kuchnia (KDS)', description: 'Ekran kuchni i ekspedycji', href: '/kds', accent: '#EF4444' },
  { key: 'manager', label: 'Manager', description: 'AI, raporty, magazyn, finanse, HR, CRM', href: '/owner', accent: '#A855F7' },
  { key: 'employee', label: 'Zespół', description: 'Grafik, zadania, szkolenia, przepisy', href: '/dashboard', accent: '#3B82F6' },
]

const MANAGER_PERMS = [
  PERMISSIONS.VIEW_ANALYTICS, PERMISSIONS.VIEW_FINANCE, PERMISSIONS.MANAGE_ORG,
  PERMISSIONS.MANAGE_SCHEDULE, PERMISSIONS.MANAGE_INVENTORY, PERMISSIONS.MANAGE_PRODUCTS,
  PERMISSIONS.VIEW_USERS,
]

// Czy użytkownik ma dostęp do danego modułu.
export function canAccessModule(user: RbacUser, key: ModuleKey): boolean {
  switch (key) {
    case 'manager':
      return isOwner(user) || MANAGER_PERMS.some((p) => hasPermission(user, p))
    case 'pos':
      return isOwner(user) || hasPermission(user, PERMISSIONS.MANAGE_ORDERS)
    case 'kitchen':
    case 'employee':
      return true // ekran kuchni i przestrzeń zespołu dostępne dla każdego zalogowanego
    default:
      return false
  }
}

// Moduły widoczne dla użytkownika w launcherze (z zachowaniem kolejności priorytetu).
export function modulesForUser(user: RbacUser): PlatformModule[] {
  return MODULES.filter((m) => canAccessModule(user, m.key))
}
