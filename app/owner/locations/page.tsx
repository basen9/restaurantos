'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Trophy, MapPin } from 'lucide-react'

export default function LocationsPage() {
  const qc = useQueryClient()
  const { data: analytics, isLoading } = useQuery({ queryKey: ['analytics'], queryFn: () => fetch('/api/analytics').then(r => r.json()) })
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', city: '', address: '' })

  const add = useMutation({
    mutationFn: (d: any) => fetch('/api/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => { toast.success('Lokal dodany'); setShowAdd(false); setForm({ name: '', city: '', address: '' }); qc.invalidateQueries({ queryKey: ['analytics'] }) },
    onError: (e: any) => toast.error(e.message || 'Błąd'),
  })

  if (isLoading) return <PageLoader />
  const locations = analytics?.locations || []
  const totalRevenue = locations.reduce((s: number, l: any) => s + l.revenueToday, 0)

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl text-[#F5F0E8]">Lokale</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">Ranking rentowności i analityka per lokal</p>
        </div>
        <button className="btn btn-gold" onClick={() => setShowAdd(true)}><Plus size={14} /> Dodaj lokal</button>
      </div>

      {locations.length === 0 ? <EmptyState icon="🏪" text="Brak lokali" /> : (
        <div className="space-y-3">
          {locations.map((l: any, i: number) => (
            <div key={l.id} className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: i === 0 ? 'rgba(232,185,35,0.2)' : 'rgba(255,255,255,0.05)', color: i === 0 ? '#E8B923' : '#9AAAB8' }}>
                  {i === 0 ? <Trophy size={14} /> : i + 1}
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <MapPin size={14} className="text-[#6B7A8D]" />
                  <span className="text-sm font-semibold text-[#E8ECF0]">{l.name}</span>
                </div>
                <Badge variant={i === 0 ? 'gold' : 'gray'}>{l.score} pkt</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div><div className="text-lg font-bold text-[#F5F0E8]">{l.revenueToday} zł</div><div className="text-[10px] text-[#6B7A8D]">sprzedaż dziś</div></div>
                <div><div className="text-lg font-bold text-[#F5F0E8]">{l.marginPct != null ? `${l.marginPct}%` : '—'}</div><div className="text-[10px] text-[#6B7A8D]">marża surowca</div></div>
                <div><div className="text-lg font-bold" style={{ color: l.laborPct != null && l.laborPct > 30 ? '#EF4444' : '#F5F0E8' }}>{l.laborPct != null ? `${l.laborPct}%` : '—'}</div><div className="text-[10px] text-[#6B7A8D]">koszt pracy</div></div>
                <div><div className="text-lg font-bold" style={{ color: l.wasteMonth > 0 ? '#F97316' : '#F5F0E8' }}>{l.wasteMonth} zł</div><div className="text-[10px] text-[#6B7A8D]">straty (m-c)</div></div>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 text-[11px] text-[#6B7A8D]">
                <span>👥 {l.headcount} pracowników · {l.activeNow} na zmianie</span>
                <span>📅 7 dni: {l.revenueWeek} zł</span>
                {l.openIncidents > 0 && <span className="text-red-400">⚠️ {l.openIncidents} awarii</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {locations.length > 1 && (
        <div className="text-xs text-[#6B7A8D] mt-4 text-center">Łączna sprzedaż dziś: <span className="text-[#E8ECF0] font-semibold">{totalRevenue} zł</span> · {locations.length} lokali</div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nowy lokal">
        <div className="space-y-3">
          <input className="input" placeholder="Nazwa lokalu" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Miasto" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
            <input className="input" placeholder="Adres" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          </div>
          <button className="btn btn-gold w-full" disabled={!form.name || add.isPending} onClick={() => add.mutate({ name: form.name, city: form.city || undefined, address: form.address || undefined })}>Dodaj lokal</button>
        </div>
      </Modal>
    </div>
  )
}
