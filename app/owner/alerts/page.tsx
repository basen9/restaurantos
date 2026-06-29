'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import toast from 'react-hot-toast'
import { Sparkles, RefreshCw, Check, X, ChevronRight } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'

const sev: Record<string, string> = { URGENT: '#EF4444', HIGH: '#EF4444', MEDIUM: '#F97316', LOW: '#E8B923' }

export default function AlertsPage() {
  const qc = useQueryClient()
  const { data: alerts = [], isLoading } = useQuery({ queryKey: ['alerts'], queryFn: () => fetch('/api/alerts').then(r => r.json()), refetchInterval: 60000 })

  const run = useMutation({
    mutationFn: () => fetch('/api/alerts/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: (d) => { toast.success(`Analiza gotowa: ${d.created} nowych alertów`); qc.invalidateQueries({ queryKey: ['alerts'] }) },
    onError: (e: any) => toast.error(e.message || 'Błąd'),
  })
  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => fetch(`/api/alerts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts'] }) },
    onError: () => toast.error('Błąd'),
  })

  if (isLoading) return <PageLoader />
  const list = Array.isArray(alerts) ? alerts : []

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl text-[#F5F0E8] flex items-center gap-2"><Sparkles size={18} className="text-yellow-400" /> Alerty AI COO</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">Proaktywne wykrywanie problemów i decyzji</p>
        </div>
        <button className="btn btn-gold" disabled={run.isPending} onClick={() => run.mutate()}><RefreshCw size={14} className={run.isPending ? 'animate-spin' : ''} /> Uruchom analizę</button>
      </div>

      {list.length === 0 ? <EmptyState icon="✅" text="Brak otwartych alertów" sub="Uruchom analizę lub poczekaj na automatyczny przegląd" /> : (
        <div className="space-y-2">
          {list.map((a: any) => (
            <div key={a.id} className="card p-4 flex items-start gap-3 border-l-2" style={{ borderColor: sev[a.severity] || '#E8B923' }}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#E8ECF0]">{a.title}</div>
                <div className="text-xs text-[#6B7A8D] mt-0.5">{a.detail}</div>
                <div className="text-[10px] text-[#6B7A8D] mt-1">{formatDate(a.createdAt)} {formatTime(a.createdAt)}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {a.actionHref && <Link href={a.actionHref} className="text-xs font-semibold text-yellow-400 flex items-center gap-0.5">Przejdź <ChevronRight size={12} /></Link>}
                <button className="btn btn-success py-1.5 px-2 text-xs" title="Rozwiązane" onClick={() => decide.mutate({ id: a.id, status: 'RESOLVED' })}><Check size={12} /></button>
                <button className="btn btn-ghost py-1.5 px-2 text-xs" title="Odrzuć" onClick={() => decide.mutate({ id: a.id, status: 'DISMISSED' })}><X size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
