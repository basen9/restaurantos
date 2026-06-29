'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useQuery } from '@tanstack/react-query'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const { data: notifs = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetch('/api/notifications').then(r => r.json()),
    refetchInterval: 30000,
  })

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-count'],
    queryFn: () => fetch('/api/tasks').then(r => r.json()),
    refetchInterval: 60000,
  })

  const { data: clock } = useQuery({
    queryKey: ['clock'],
    queryFn: () => fetch('/api/shifts/clock').then(r => r.json()),
    refetchInterval: 60000,
  })

  const unreadNotifs = Array.isArray(notifs) ? notifs.filter((n: any) => !n.read).length : 0
  const pendingTasks = Array.isArray(tasks) ? tasks.filter((t: any) => t.status === 'TODO' || t.status === 'IN_PROGRESS').length : 0

  // Stan zmiany ze źródła prawdy (baza) — zasila wskaźnik w TopBar (koniec martwego stanu).
  const [elapsed, setElapsed] = useState('')
  const shiftActive = !!clock?.active
  const shiftStart = clock?.shift?.actualStart ? new Date(clock.shift.actualStart).getTime() : null

  useEffect(() => {
    if (!shiftActive || !shiftStart) { setElapsed(''); return }
    const tick = () => {
      const sec = Math.floor((Date.now() - shiftStart) / 1000)
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
      setElapsed(h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [shiftActive, shiftStart])

  // Zamknij drawer przy zmianie trasy.
  useEffect(() => { setMobileOpen(false) }, [pathname])

  if (!session) return null

  return (
    <div className="flex h-screen overflow-hidden bg-deep">
      {/* Sidebar — statyczny na desktopie */}
      <div className="hidden md:block w-56 flex-shrink-0 h-full overflow-hidden">
        <Sidebar notifCount={unreadNotifs} taskCount={pendingTasks} />
      </div>

      {/* Sidebar — drawer na mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 max-w-[80vw] animate-fade-in">
            <Sidebar notifCount={unreadNotifs} taskCount={pendingTasks} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar notifCount={unreadNotifs} shiftActive={shiftActive} shiftElapsed={elapsed} onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
