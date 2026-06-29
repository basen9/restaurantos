'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

const typeLabels: Record<string, string> = { ANNUAL:'Urlop wypoczynkowy', ON_DEMAND:'Urlop na żądanie', UNPAID:'Urlop bezpłatny', SICK:'Zwolnienie lekarskie', OTHER:'Inna nieobecność' }
const statusVariant: Record<string, string> = { PENDING:'orange', APPROVED:'green', REJECTED:'red', CANCELLED:'gray' }
const statusLabels: Record<string, string> = { PENDING:'Oczekujący', APPROVED:'Zaakceptowany', REJECTED:'Odrzucony', CANCELLED:'Anulowany' }

export default function VacationPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' })

  const { data: vacations = [], isLoading } = useQuery({ queryKey: ['vacations'], queryFn: () => fetch('/api/vacations').then(r => r.json()) })

  const addVacation = useMutation({
    mutationFn: (data: any) => fetch('/api/vacations', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vacations'] }); toast.success('Wniosek wysłany do managera'); setShowAdd(false) }
  })

  const calcDays = () => {
    if (!form.startDate || !form.endDate) return 0
    const d = (new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000 + 1
    return Math.max(0, d)
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="font-display text-2xl text-[#F5F0E8]">Urlopy i nieobecności</h1><p className="text-sm text-[#6B7A8D] mt-0.5">Zarządzaj wnioskami</p></div>
        <button className="btn btn-gold" onClick={() => setShowAdd(true)}><Plus size={14}/> Złóż wniosek</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Urlop wypoczynkowy" value="18 dni" sub="pozostało" accent="gold" />
        <StatCard label="Wykorzystano" value="8 dni" sub="w tym roku" />
        <StatCard label="Na żądanie" value="4/4" sub="dni" />
        <StatCard label="Oczekujące" value={Array.isArray(vacations) ? vacations.filter((v:any)=>v.status==='PENDING').length : 0} sub="wniosków" />
      </div>

      {!Array.isArray(vacations) || vacations.length === 0 ? (
        <EmptyState icon="🏖️" text="Brak wniosków urlopowych" sub="Kliknij 'Złóż wniosek' aby dodać pierwszy" />
      ) : (
        <div className="space-y-2">
          {vacations.map((v: any) => (
            <div key={v.id} className="card p-4 flex items-center gap-4">
              <div className={`w-1 self-stretch rounded-full ${v.status === 'APPROVED' ? 'bg-green-400' : v.status === 'REJECTED' ? 'bg-red-400' : 'bg-orange-400'}`} />
              <div className="flex-1">
                <div className="font-medium text-sm text-[#E8ECF0]">{typeLabels[v.type] || v.type}</div>
                <div className="text-xs text-[#6B7A8D] mt-0.5">
                  {new Date(v.startDate).toLocaleDateString('pl-PL')} – {new Date(v.endDate).toLocaleDateString('pl-PL')} · {v.days} {v.days === 1 ? 'dzień' : 'dni'}
                </div>
                {v.reason && <div className="text-xs text-[#6B7A8D] mt-1 italic">„{v.reason}"</div>}
              </div>
              <Badge variant={statusVariant[v.status] || 'gray'}>{statusLabels[v.status] || v.status}</Badge>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Złóż wniosek urlopowy">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Rodzaj nieobecności</label>
            <select className="input" value={form.type} onChange={e => setForm(p=>({...p, type:e.target.value}))}>
              {Object.entries(typeLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Od</label>
              <input type="date" className="input" value={form.startDate} onChange={e => setForm(p=>({...p, startDate:e.target.value}))} /></div>
            <div><label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Do</label>
              <input type="date" className="input" value={form.endDate} onChange={e => setForm(p=>({...p, endDate:e.target.value}))} /></div>
          </div>
          {calcDays() > 0 && <div className="text-xs text-yellow-400 font-medium">📅 Liczba dni: {calcDays()}</div>}
          <div><label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Powód (opcjonalnie)</label>
            <textarea className="input" rows={2} value={form.reason} onChange={e => setForm(p=>({...p, reason:e.target.value}))} /></div>
          <div className="flex gap-3">
            <button className="btn btn-ghost flex-1" onClick={() => setShowAdd(false)}>Anuluj</button>
            <button className="btn btn-gold flex-1" disabled={!form.startDate || !form.endDate}
              onClick={() => addVacation.mutate({...form, days: calcDays()})}>Złóż wniosek</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
