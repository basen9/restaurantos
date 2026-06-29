'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useQuery } from '@tanstack/react-query'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [shiftActive, setShiftActive] = useState(false)
  const [shiftStart, setShiftStart] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState('')

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

  const unreadNotifs = Array.isArray(notifs) ? notifs.filter((n: any) => !n.read).length : 0
  const pendingTasks = Array.isArray(tasks) ? tasks.filter((t: any) => t.status === 'TODO' || t.status === 'IN_PROGRESS').length : 0

  // Timer
  useEffect(() => {
    if (!shiftActive || !shiftStart) { setElapsed(''); return }
    const id = setInterval(() => {
      const sec = Math.floor((Date.now() - shiftStart) / 1000)
      const h = Math.floor(sec / 3600)
      const m = Math.floor((sec % 3600) / 60)
      const s = sec % 60
      setElapsed(h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`)
    }, 1000)
    return () => clearInterval(id)
  }, [shiftActive, shiftStart])

  if (!session) return null

  return (
    <div className="flex h-screen overflow-hidden bg-deep">
      <div className="w-56 flex-shrink-0 h-full overflow-hidden">
        <Sidebar notifCount={unreadNotifs} taskCount={pendingTasks} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar notifCount={unreadNotifs} shiftActive={shiftActive} shiftElapsed={elapsed} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
