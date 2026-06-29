'use client'
import { useQuery } from '@tanstack/react-query'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'

// Czas zmiany w minutach: preferuj realny clock-in/out, fallback do zaplanowanego.
function minutes(s: any): number {
  if (s.actualStart && s.actualEnd) return Math.round((new Date(s.actualEnd).getTime() - new Date(s.actualStart).getTime()) / 60000)
  if (s.startTime && s.endTime) {
    const [h1, m1] = s.startTime.split(':').map(Number)
    const [h2, m2] = s.endTime.split(':').map(Number)
    return Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1))
  }
  return 0
}
const fmtH = (min: number) => `${Math.floor(min / 60)}h ${min % 60}min`

export default function TimePage() {
  const { data: shifts = [], isLoading } = useQuery({ queryKey: ['shifts'], queryFn: () => fetch('/api/shifts').then(r => r.json()) })
  if (isLoading) return <PageLoader />

  const list = Array.isArray(shifts) ? shifts : []
  const completed = list.filter((s: any) => s.status === 'COMPLETED' || (s.actualStart && s.actualEnd))
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)

  const monthMin = completed.filter((s: any) => new Date(s.date) >= monthStart).reduce((a: number, s: any) => a + minutes(s), 0)
  const weekMin = completed.filter((s: any) => new Date(s.date) >= weekAgo).reduce((a: number, s: any) => a + minutes(s), 0)
  const active = list.find((s: any) => s.status === 'ACTIVE')

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Czas pracy</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Twoje przepracowane godziny</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Ten tydzień" value={fmtH(weekMin)} sub="przepracowano" accent="gold" />
        <StatCard label="Ten miesiąc" value={fmtH(monthMin)} sub="przepracowano" />
        <StatCard label="Status" value={active ? 'Na zmianie' : 'Poza'} sub={active ? `od ${active.startTime}` : 'brak aktywnej'} accent={active ? 'green' : undefined} />
      </div>

      <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-3">Historia zmian</div>
      {completed.length === 0 ? <EmptyState icon="⏱️" text="Brak zakończonych zmian" /> : (
        <div className="space-y-2">
          {completed.slice().reverse().slice(0, 20).map((s: any) => (
            <div key={s.id} className="card p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[#E8ECF0]">{formatDate(s.date)}</div>
                <div className="text-xs text-[#6B7A8D] mt-0.5">{s.actualStart && s.actualEnd ? 'rejestracja czasu' : 'wg grafiku'} · {s.startTime}–{s.endTime}</div>
              </div>
              <Badge variant="green">{fmtH(minutes(s))}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
