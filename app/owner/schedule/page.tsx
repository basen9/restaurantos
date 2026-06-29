'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import toast from 'react-hot-toast'
import { Wand2, TrendingUp, Users } from 'lucide-react'

const DOW = ['Niedz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob']

export default function OwnerSchedulePage() {
  const qc = useQueryClient()
  const { data: forecast, isLoading: l1 } = useQuery({ queryKey: ['schedule-forecast'], queryFn: () => fetch('/api/schedule/forecast').then(r => r.json()) })
  const { data: coverage, isLoading: l2 } = useQuery({ queryKey: ['schedule-coverage'], queryFn: () => fetch('/api/schedule/coverage').then(r => r.json()) })

  const generate = useMutation({
    mutationFn: (weekStart: string) => fetch('/api/schedule/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weekStart }) }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: (d) => { toast.success(`Wygenerowano grafik: ${d.totalShifts} zmian`); qc.invalidateQueries({ queryKey: ['schedule-coverage'] }) },
    onError: (e: any) => toast.error(e.message || 'Błąd generowania'),
  })

  if (l1 || l2) return <PageLoader />
  const days = coverage?.days || []
  const totalRecommended = days.reduce((s: number, d: any) => s + d.recommended, 0)
  const totalPlanned = days.reduce((s: number, d: any) => s + d.planned, 0)

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl text-[#F5F0E8]">Grafik (inteligentny)</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">Prognoza popytu → rekomendowana obsada → automatyczny grafik</p>
        </div>
        <button className="btn btn-gold" disabled={generate.isPending || !coverage?.weekStart} onClick={() => coverage?.weekStart && generate.mutate(coverage.weekStart)}>
          <Wand2 size={14} /> {generate.isPending ? 'Generowanie…' : 'Generuj grafik (przyszły tydzień)'}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Cel kosztu pracy" value={`${Math.round((forecast?.targetLaborPct || 0) * 100)}%`} sub="sprzedaży" />
        <StatCard label="Śr. stawka" value={`${forecast?.avgHourlyRate || 0} zł/h`} />
        <StatCard label="Rekom. zmian / tydz." value={totalRecommended} accent="gold" />
        <StatCard label="Zaplanowane" value={totalPlanned} accent={totalPlanned < totalRecommended ? 'red' : 'green'} />
      </div>

      {!forecast?.hasSalesHistory && (
        <div className="card p-3 mb-6 text-xs text-[#9AAAB8] flex items-center gap-2" style={{ borderColor: 'rgba(56,130,246,0.25)' }}>
          <TrendingUp size={14} className="text-blue-400" /> Brak historii sprzedaży — prognoza ruszy po podłączeniu POS i zebraniu danych. Rekomendacje będą wtedy dokładniejsze.
        </div>
      )}

      <div className="flex items-center gap-2 mb-3"><Users size={14} className="text-[#6B7A8D]" /><span className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest">Pokrycie tygodnia ({coverage?.weekStart})</span></div>
      <div className="space-y-2">
        {days.map((d: any) => {
          const gap = d.planned - d.recommended
          return (
            <div key={d.date} className="card p-4 flex items-center gap-4">
              <div className="w-12 text-center flex-shrink-0">
                <div className="text-sm font-bold text-[#F5F0E8]">{DOW[d.dow]}</div>
                <div className="text-[10px] text-[#6B7A8D]">{d.date.slice(5)}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-[#6B7A8D]">Prognoza: {d.forecastRevenue} zł · rekom. {d.recommended} os.</div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mt-1.5">
                  <div className="h-full rounded-full" style={{ width: `${d.recommended ? Math.min(100, (d.planned / d.recommended) * 100) : (d.planned ? 100 : 0)}%`, background: gap < 0 ? '#EF4444' : '#22C55E' }} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-semibold text-[#E8ECF0]">{d.planned}/{d.recommended}</div>
                <Badge variant={gap < 0 ? 'red' : gap > 0 ? 'orange' : 'green'}>{gap < 0 ? `brakuje ${-gap}` : gap > 0 ? `nadmiar ${gap}` : 'OK'}</Badge>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
