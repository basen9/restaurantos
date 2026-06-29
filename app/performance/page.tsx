'use client'
import { useQuery } from '@tanstack/react-query'
import { StatCard } from '@/components/ui/StatCard'
import { PageLoader } from '@/components/ui/LoadingSpinner'

export default function PerformancePage() {
  const { data: tasks = [], isLoading: l1 } = useQuery({ queryKey: ['tasks'], queryFn: () => fetch('/api/tasks').then(r => r.json()) })
  const { data: waste = [], isLoading: l2 } = useQuery({ queryKey: ['waste'], queryFn: () => fetch('/api/waste').then(r => r.json()) })
  const { data: shifts = [], isLoading: l3 } = useQuery({ queryKey: ['shifts'], queryFn: () => fetch('/api/shifts').then(r => r.json()) })

  if (l1 || l2 || l3) return <PageLoader />

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const inMonth = (d: any) => new Date(d) >= monthStart

  const tArr = Array.isArray(tasks) ? tasks : []
  const wArr = Array.isArray(waste) ? waste : []
  const sArr = Array.isArray(shifts) ? shifts : []

  const tasksDone = tArr.filter((t: any) => t.status === 'DONE').length
  const tasksOpen = tArr.filter((t: any) => t.status === 'TODO' || t.status === 'IN_PROGRESS').length
  const completionRate = tArr.length ? Math.round((tasksDone / tArr.length) * 100) : 0
  const shiftsDone = sArr.filter((s: any) => s.status === 'COMPLETED' && inMonth(s.date)).length
  const wasteCount = wArr.filter((w: any) => inMonth(w.date)).length

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Moje wyniki</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Twoja aktywność w tym miesiącu</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Zadania wykonane" value={tasksDone} sub={`${tasksOpen} w toku`} accent="green" />
        <StatCard label="Skuteczność" value={`${completionRate}%`} sub="ukończonych zadań" accent="gold" />
        <StatCard label="Zmiany" value={shiftsDone} sub="zakończone (m-c)" />
        <StatCard label="Zgłoszenia strat" value={wasteCount} sub="ten miesiąc" />
      </div>

      <div className="card p-5">
        <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-4">Postęp zadań</div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-green-400 transition-all" style={{ width: `${completionRate}%` }} />
          </div>
          <span className="text-sm font-semibold text-[#E8ECF0]">{completionRate}%</span>
        </div>
        <div className="text-xs text-[#6B7A8D] mt-2">{tasksDone} z {tArr.length} zadań ukończonych</div>
      </div>
    </div>
  )
}
