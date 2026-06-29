'use client'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, statusLabel } from '@/lib/utils'
import { Calendar, MapPin, Clock } from 'lucide-react'

const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']

export default function SchedulePage() {
  const { data: shifts = [], isLoading } = useQuery({ queryKey: ['shifts'], queryFn: () => fetch('/api/shifts').then(r => r.json()) })
  if (isLoading) return <PageLoader />

  const list = Array.isArray(shifts) ? shifts : []
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const upcoming = list.filter((s: any) => new Date(s.date) >= today)
  const past = list.filter((s: any) => new Date(s.date) < today).reverse()

  const statusVariant = (s: string) => s === 'ACTIVE' ? 'gold' : s === 'COMPLETED' ? 'green' : s === 'ABSENT' || s === 'LATE' ? 'red' : 'blue'

  const Row = ({ s }: { s: any }) => {
    const d = new Date(s.date)
    return (
      <div className="card p-4 flex items-center gap-4">
        <div className="text-center flex-shrink-0 w-12">
          <div className="text-lg font-bold text-[#F5F0E8]">{d.getDate()}</div>
          <div className="text-[10px] text-[#6B7A8D] uppercase">{dayNames[d.getDay()].slice(0, 3)}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[#E8ECF0] flex items-center gap-1.5"><Clock size={12} className="text-[#6B7A8D]" /> {s.startTime}–{s.endTime}</div>
          <div className="text-xs text-[#6B7A8D] flex items-center gap-1.5 mt-0.5"><MapPin size={11} /> {s.location?.name || '—'}</div>
        </div>
        <Badge variant={statusVariant(s.status)}>{statusLabel(s.status)}</Badge>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Mój grafik</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Twoje zaplanowane i przeszłe zmiany</p>
      </div>

      <div className="flex items-center gap-2 mb-3"><Calendar size={14} className="text-[#6B7A8D]" /><span className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest">Nadchodzące</span></div>
      {upcoming.length === 0 ? <EmptyState icon="📅" text="Brak zaplanowanych zmian" /> : <div className="space-y-2 mb-6">{upcoming.map((s: any) => <Row key={s.id} s={s} />)}</div>}

      {past.length > 0 && (
        <>
          <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-3">Historia</div>
          <div className="space-y-2 opacity-70">{past.slice(0, 10).map((s: any) => <Row key={s.id} s={s} />)}</div>
        </>
      )}
    </div>
  )
}
