'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Calendar, Clock, Umbrella, RefreshCw, CheckSquare, ListTodo,
  Package, Trash2, AlertTriangle, Bell, MessageSquare, Bot, BarChart3,
  Users, Settings, ChevronRight, ChefHat, Warehouse
} from 'lucide-react'

const employeeNav = [
  { section: 'Główne', items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/schedule', label: 'Mój grafik', icon: Calendar },
    { href: '/time', label: 'Czas pracy', icon: Clock },
    { href: '/vacation', label: 'Urlopy', icon: Umbrella },
    { href: '/swaps', label: 'Zamiana zmian', icon: RefreshCw },
  ]},
  { section: 'Praca', items: [
    { href: '/tasks', label: 'Zadania', icon: CheckSquare, badge: 'tasks' },
    { href: '/checklists', label: 'Checklisty', icon: ListTodo },
    { href: '/production', label: 'Produkcja', icon: Package },
    { href: '/inventory', label: 'Remanent', icon: Package },
    { href: '/waste', label: 'Zgłoś stratę', icon: Trash2 },
    { href: '/incidents', label: 'Zgłoś awarię', icon: AlertTriangle },
  ]},
  { section: 'Komunikacja', items: [
    { href: '/notifications', label: 'Powiadomienia', icon: Bell, badge: 'notifs' },
    { href: '/messages', label: 'Wiadomości', icon: MessageSquare },
    { href: '/assistant', label: 'Asystent AI', icon: Bot },
  ]},
  { section: 'Profil', items: [
    { href: '/performance', label: 'Moje wyniki', icon: BarChart3 },
  ]},
]

const ownerNav = [
  { section: 'Centrum dowodzenia', items: [
    { href: '/owner', label: 'Dashboard CEO', icon: LayoutDashboard },
    { href: '/owner/coo', label: 'AI COO', icon: Bot },
    { href: '/owner/analytics', label: 'Analityka', icon: BarChart3 },
  ]},
  { section: 'Zespół', items: [
    { href: '/owner/employees', label: 'Pracownicy', icon: Users },
    { href: '/owner/schedule', label: 'Grafiki', icon: Calendar },
    { href: '/owner/tasks', label: 'Zadania', icon: CheckSquare },
    { href: '/owner/vacations', label: 'Urlopy', icon: Umbrella },
  ]},
  { section: 'Operacje', items: [
    { href: '/owner/warehouse', label: 'Magazyn', icon: Warehouse },
    { href: '/owner/recipes', label: 'Receptury & food cost', icon: ChefHat },
    { href: '/owner/waste', label: 'Straty', icon: Trash2 },
    { href: '/owner/incidents', label: 'Awarie', icon: AlertTriangle },
  ]},
  { section: 'Komunikacja', items: [
    { href: '/notifications', label: 'Powiadomienia', icon: Bell, badge: 'notifs' },
    { href: '/messages', label: 'Wiadomości', icon: MessageSquare },
  ]},
]

export function Sidebar({ notifCount = 0, taskCount = 0 }: { notifCount?: number; taskCount?: number }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const isOwner = role === 'OWNER'
  const nav = isOwner ? ownerNav : employeeNav

  return (
    <aside className="flex flex-col h-full" style={{background: '#1A1D27', borderRight: '1px solid rgba(255,255,255,0.07)'}}>
      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
               style={{background: 'linear-gradient(135deg, rgba(232,185,35,0.3), rgba(232,185,35,0.1))', border: '1px solid rgba(232,185,35,0.3)'}}>☕</div>
          <div>
            <div className="font-display text-sm text-yellow-400 leading-tight">RestaurantOS</div>
            <div className="text-[10px] text-[#6B7A8D] leading-tight">{(session?.user as any)?.locationName || 'Kraków Rynek'}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {nav.map(section => (
          <div key={section.section} className="mb-4">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-[#6B7A8D] uppercase tracking-widest">{section.section}</div>
            {section.items.map(item => {
              const active = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/owner' && pathname.startsWith(item.href))
              const count = (item as any).badge === 'notifs' ? notifCount : (item as any).badge === 'tasks' ? taskCount : 0
              return (
                <Link key={item.href} href={item.href}
                  className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all relative mb-0.5',
                    active ? 'nav-active' : 'text-[#9AAAB8] hover:text-[#E8ECF0] hover:bg-white/5')}>
                  <item.icon size={15} className="flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {count > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">{count}</span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
