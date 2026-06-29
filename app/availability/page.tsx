'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']
type Day = { dayOfWeek: number; available: boolean; fromTime: string; toTime: string }

export default function AvailabilityPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['availability'], queryFn: () => fetch('/api/availability').then(r => r.json()) })
  const [days, setDays] = useState<Day[]>([])

  useEffect(() => {
    const base: Day[] = DAYS.map((_, i) => ({ dayOfWeek: i, available: true, fromTime: '08:00', toTime: '16:00' }))
    if (Array.isArray(data)) for (const d of data) { const x = base[d.dayOfWeek]; if (x) { x.available = d.available; x.fromTime = d.fromTime || '08:00'; x.toTime = d.toTime || '16:00' } }
    setDays(base)
  }, [data])

  const save = useMutation({
    mutationFn: (payload: any) => fetch('/api/availability', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => { toast.success('Dostępność zapisana'); qc.invalidateQueries({ queryKey: ['availability'] }) },
    onError: () => toast.error('Błąd zapisu'),
  })

  if (isLoading) return <PageLoader />

  const set = (i: number, patch: Partial<Day>) => setDays(p => p.map((d, j) => j === i ? { ...d, ...patch } : d))

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Moja dostępność</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Określ, kiedy możesz pracować — wpływa na układanie grafiku</p>
      </div>
      <div className="space-y-2 mb-5">
        {days.map((d, i) => (
          <div key={i} className="card p-3 flex items-center gap-3">
            <button onClick={() => set(i, { available: !d.available })}
              className={cn('w-28 text-left text-sm font-medium px-3 py-2 rounded-lg transition-all', d.available ? 'text-[#E8ECF0]' : 'text-[#6B7A8D] line-through')}
              style={{ background: d.available ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)' }}>
              {DAYS[i].slice(0, 3)} {d.available ? '✓' : '—'}
            </button>
            {d.available ? (
              <div className="flex items-center gap-2 flex-1">
                <input type="time" className="input" value={d.fromTime} onChange={e => set(i, { fromTime: e.target.value })} />
                <span className="text-[#6B7A8D]">–</span>
                <input type="time" className="input" value={d.toTime} onChange={e => set(i, { toTime: e.target.value })} />
              </div>
            ) : <span className="text-xs text-[#6B7A8D] flex-1">Niedostępny/a</span>}
          </div>
        ))}
      </div>
      <button className="btn btn-gold w-full" disabled={save.isPending} onClick={() => save.mutate({ days })}>{save.isPending ? 'Zapisywanie…' : 'Zapisz dostępność'}</button>
    </div>
  )
}
