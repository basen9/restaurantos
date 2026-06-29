'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import toast from 'react-hot-toast'
import { Plug, RefreshCw, CheckCircle2, TrendingUp } from 'lucide-react'
import { formatTime } from '@/lib/utils'

export default function AnalyticsPage() {
  const qc = useQueryClient()
  const { data: pos, isLoading } = useQuery({ queryKey: ['pos'], queryFn: () => fetch('/api/pos').then(r => r.json()) })
  const { data: analytics } = useQuery({ queryKey: ['analytics'], queryFn: () => fetch('/api/analytics').then(r => r.json()) })
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: () => fetch('/api/sales').then(r => r.json()).catch(() => []) })

  const sync = useMutation({
    mutationFn: () => fetch('/api/pos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error || 'err') }); return r.json() }),
    onSuccess: (d) => { toast.success(`Zsynchronizowano ${d.transactions} transakcji (${d.revenue} zł)`); qc.invalidateQueries({ queryKey: ['pos'] }); qc.invalidateQueries({ queryKey: ['analytics'] }); qc.invalidateQueries({ queryKey: ['sales'] }) },
    onError: (e: any) => toast.error(e.message || 'Błąd synchronizacji'),
  })

  if (isLoading) return <PageLoader />
  const f = analytics?.finance || {}
  const connected = pos?.connected
  const salesList = Array.isArray(sales) ? sales : []

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Finanse i POS</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Sprzedaż, marża i food cost rzeczywisty z systemu sprzedaży</p>
      </div>

      {/* Połączenie POS */}
      <div className="card p-5 mb-6" style={{ borderColor: connected ? 'rgba(34,197,94,0.25)' : 'rgba(56,130,246,0.25)' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {connected ? <CheckCircle2 size={20} className="text-green-400" /> : <Plug size={20} className="text-blue-400" />}
            <div>
              <div className="text-sm font-semibold text-[#E8ECF0]">{connected ? `POS połączony (${pos.provider})` : 'POS niepołączony'}</div>
              <div className="text-xs text-[#6B7A8D]">{connected && pos.lastSyncAt ? `Ostatnia synchronizacja: ${formatTime(pos.lastSyncAt)}` : 'Połącz, aby śledzić sprzedaż i marżę w czasie rzeczywistym'}</div>
            </div>
          </div>
          <button className="btn btn-gold" onClick={() => sync.mutate()} disabled={sync.isPending}>
            <RefreshCw size={14} className={sync.isPending ? 'animate-spin' : ''} /> {connected ? 'Synchronizuj' : 'Połącz POS (demo)'}
          </button>
        </div>
        <div className="text-[10px] text-[#6B7A8D] mt-3">Tryb demonstracyjny generuje realistyczną sprzedaż dnia. Architektura gotowa pod realne integracje (Toast, Square, GoPOS).</div>
      </div>

      {/* KPI finansowe */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Sprzedaż dziś" value={f.salesToday != null ? `${f.salesToday} zł` : '—'} accent="gold" />
        <StatCard label="Zysk dziś (szac.)" value={f.profitToday != null ? `${f.profitToday} zł` : '—'} sub="po koszcie surowca" accent={f.profitToday != null ? 'green' : undefined} />
        <StatCard label="Marża" value={f.marginPct != null ? `${f.marginPct}%` : '—'} />
        <StatCard label="Food cost rzeczyw." value={f.foodCostPct != null ? `${f.foodCostPct}%` : '—'} accent={f.foodCostPct != null && f.foodCostPct > 35 ? 'red' : 'green'} />
      </div>

      {/* Ostatnia sprzedaż */}
      <div className="flex items-center gap-2 mb-3"><TrendingUp size={14} className="text-[#6B7A8D]" /><span className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest">Ostatnia sprzedaż</span></div>
      {salesList.length === 0 ? <EmptyState icon="🧾" text="Brak transakcji" sub="Połącz POS, aby zobaczyć sprzedaż" /> : (
        <div className="space-y-2">
          {salesList.slice(0, 15).map((s: any) => (
            <div key={s.id} className="card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[#E8ECF0] truncate">{(s.items || []).map((i: any) => `${i.quantity}× ${i.name}`).join(', ')}</div>
                <div className="text-xs text-[#6B7A8D]">{formatTime(s.soldAt)}</div>
              </div>
              <Badge variant={s.source === 'MOCK' ? 'blue' : s.source === 'POS' ? 'green' : 'gray'}>{s.source}</Badge>
              <span className="text-sm font-semibold text-[#E8ECF0]">{s.total} zł</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
