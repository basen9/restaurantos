'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDate } from '@/lib/utils'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import { Play, Square, ChevronRight, Bell, CheckSquare, Trash2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export function DashboardClient() {
  const { data: session } = useSession()
  const user = session?.user as any
  const qc = useQueryClient()
  const [shiftActive, setShiftActive] = useState(false)
  const [shiftStart, setShiftStart] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState('0:00')
  const [loading, setLoading] = useState(false)

  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => fetch('/api/tasks').then(r => r.json()) })
  const { data: notifs = [] } = useQuery({ queryKey: ['notifications'], queryFn: () => fetch('/api/notifications').then(r => r.json()) })
  const { data: waste = [] } = useQuery({ queryKey: ['waste'], queryFn: () => fetch('/api/waste').then(r => r.json()) })
  const { data: clock } = useQuery({ queryKey: ['clock'], queryFn: () => fetch('/api/shifts/clock').then(r => r.json()) })
  const { data: vacations = [] } = useQuery({ queryKey: ['vacations'], queryFn: () => fetch('/api/vacations').then(r => r.json()) })

  const todoTasks = Array.isArray(tasks) ? tasks.filter((t: any) => t.status === 'TODO' || t.status === 'IN_PROGRESS') : []
  const unreadNotifs = Array.isArray(notifs) ? notifs.filter((n: any) => !n.read) : []
  const todayWaste = Array.isArray(waste) ? waste.filter((w: any) => new Date(w.date).toDateString() === new Date().toDateString()) : []
  const todayWasteCost = todayWaste.reduce((sum: number, w: any) => sum + (w.totalCost || 0), 0)

  // Pozostały urlop wypoczynkowy liczony z realnych danych (limit 26 dni/rok).
  const ANNUAL_QUOTA = 26
  const thisYear = new Date().getFullYear()
  const usedAnnual = Array.isArray(vacations)
    ? vacations.filter((v: any) => v.type === 'ANNUAL' && v.status === 'APPROVED' && new Date(v.startDate).getFullYear() === thisYear).reduce((s: number, v: any) => s + (v.days || 0), 0)
    : 0
  const remainingVacation = Math.max(0, ANNUAL_QUOTA - usedAnnual)

  // Trwały stan zmiany — synchronizacja z bazą (źródło prawdy), nie tylko stan lokalny.
  useEffect(() => {
    if (clock?.active && clock.shift?.actualStart) {
      setShiftActive(true)
      setShiftStart(new Date(clock.shift.actualStart).getTime())
    } else if (clock && !clock.active) {
      setShiftActive(false)
      setShiftStart(null)
    }
  }, [clock])

  useEffect(() => {
    if (!shiftActive || !shiftStart) return
    const id = setInterval(() => {
      const sec = Math.floor((Date.now() - shiftStart) / 1000)
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
      setElapsed(h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`)
    }, 1000)
    return () => clearInterval(id)
  }, [shiftActive, shiftStart])

  const toggleShift = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/shifts/clock', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: shiftActive ? 'end' : 'start' }) })
      if (!res.ok) throw new Error()
      if (!shiftActive) { setShiftActive(true); setShiftStart(Date.now()); toast.success('Zmiana rozpoczęta! Dobrej pracy 💪') }
      else { setShiftActive(false); setShiftStart(null); setElapsed('0:00'); toast.success('Zmiana zakończona. Do zobaczenia! 👋') }
      qc.invalidateQueries({ queryKey: ['clock'] })
    } catch { toast.error('Błąd — spróbuj ponownie') }
    setLoading(false)
  }

  const dayName = ['Niedziela','Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota'][new Date().getDay()]

  return (
    <div className="animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl text-[#F5F0E8] mb-1">Dzień dobry, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-[#6B7A8D] text-sm">{dayName}, {formatDate(new Date())} · {user?.locationName || 'Kraków Rynek'}</p>
      </div>

      {/* Shift Control */}
      <div className="card p-6 mb-6" style={{borderColor: shiftActive ? 'rgba(232,185,35,0.3)' : 'rgba(255,255,255,0.07)'}}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="font-display text-xl text-[#F5F0E8] mb-1">Kontrola zmiany</div>
            <div className="text-sm text-[#6B7A8D]">
              {shiftActive ? `Zmiana w toku · ${elapsed}` : 'Twoja zmiana nie została jeszcze rozpoczęta.'}
            </div>
          </div>
          <button onClick={toggleShift} disabled={loading}
            className={`btn text-sm px-6 py-3 ${shiftActive ? 'btn-danger' : 'btn-gold'}`}>
            {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : shiftActive ? <><Square size={14} /> Zakończ zmianę</> : <><Play size={14} /> Rozpocznij zmianę</>}
          </button>
        </div>
        {shiftActive && (
          <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-white/5">
            <div><div className="text-xs text-[#6B7A8D] uppercase tracking-wider mb-1">Czas pracy</div><div className="text-xl font-bold text-yellow-400">{elapsed}</div></div>
            <div><div className="text-xs text-[#6B7A8D] uppercase tracking-wider mb-1">Zaplanowano</div><div className="text-xl font-bold text-[#F5F0E8]">{clock?.shift?.startTime || '—'}</div></div>
            <div><div className="text-xs text-[#6B7A8D] uppercase tracking-wider mb-1">Lokal</div><div className="text-xl font-bold text-[#F5F0E8]">{user?.locationName?.split(' ')[0]}</div></div>
            <div><div className="text-xs text-[#6B7A8D] uppercase tracking-wider mb-1">Status</div><div className="text-xl font-bold text-green-400">Aktywna</div></div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Zadania dziś" value={todoTasks.length} sub="do wykonania" accent={todoTasks.length > 0 ? 'gold' : undefined} />
        <StatCard label="Powiadomienia" value={unreadNotifs.length} sub="nieprzeczytanych" accent={unreadNotifs.length > 0 ? 'blue' : undefined} />
        <StatCard label="Straty dziś" value={`${todayWasteCost.toFixed(0)} zł`} sub={`${todayWaste.length} zgłoszeń`} accent={todayWasteCost > 50 ? 'red' : undefined} />
        <StatCard label="Urlop" value={`${remainingVacation} dni`} sub="pozostało w roku" />
      </div>

      {/* Quick Actions + Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Quick Actions */}
        <div className="card p-5">
          <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-4">Szybkie akcje</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/waste', icon: '🗑️', label: 'Zgłoś stratę' },
              { href: '/incidents', icon: '⚠️', label: 'Zgłoś awarię' },
              { href: '/inventory', icon: '📦', label: 'Remanent' },
              { href: '/assistant', icon: '🤖', label: 'Asystent AI' },
              { href: '/checklists', icon: '✅', label: 'Checklisty' },
              { href: '/production', icon: '🥐', label: 'Produkcja' },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all hover:bg-white/5 border border-transparent hover:border-white/10">
                <span className="text-2xl">{a.icon}</span>
                <span className="text-xs font-medium text-[#9AAAB8]">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest">Zadania dziś</div>
            <Link href="/tasks" className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1">Wszystkie <ChevronRight size={12} /></Link>
          </div>
          {todoTasks.length === 0 ? (
            <div className="text-center py-8 text-[#6B7A8D] text-sm">Brak zadań na dziś 🎉</div>
          ) : (
            <div className="space-y-2">
              {todoTasks.slice(0, 4).map((task: any) => (
                <div key={task.id} className="card-raised p-3 flex items-center gap-3">
                  <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${task.priority === 'HIGH' ? 'bg-red-400' : task.priority === 'MEDIUM' ? 'bg-orange-400' : 'bg-green-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#E8ECF0] truncate">{task.title}</div>
                    <div className="text-xs text-[#6B7A8D]">{task.dueTime ? `Do ${task.dueTime}` : 'Bez terminu'}</div>
                  </div>
                  <Badge variant={task.status === 'IN_PROGRESS' ? 'blue' : 'orange'}>
                    {task.status === 'IN_PROGRESS' ? 'W trakcie' : 'Do zrobienia'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest">Ostatnie powiadomienia</div>
          <Link href="/notifications" className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1">Wszystkie <ChevronRight size={12} /></Link>
        </div>
        {unreadNotifs.length === 0 ? (
          <div className="text-center py-6 text-[#6B7A8D] text-sm">Wszystkie przeczytane ✓</div>
        ) : (
          <div className="space-y-2">
            {unreadNotifs.slice(0, 4).map((n: any) => (
              <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl border-l-2 border-yellow-400" style={{background:'rgba(232,185,35,0.05)'}}>
                <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#E8ECF0]">{n.title}</div>
                  <div className="text-xs text-[#6B7A8D] truncate">{n.body}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
