'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

const priorityVariant: Record<string, string> = { LOW:'green', MEDIUM:'blue', HIGH:'orange', URGENT:'red' }
const statusVariant: Record<string, string> = { OPEN:'red', IN_PROGRESS:'orange', RESOLVED:'green', CLOSED:'gray' }
const statusLabel: Record<string, string> = { OPEN:'Otwarte', IN_PROGRESS:'W naprawie', RESOLVED:'Naprawione', CLOSED:'Zamknięte' }

export default function IncidentsPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ category: 'Awaria urządzenia', device: 'Ekspres do kawy', priority: 'HIGH', description: '' })

  const { data: incidents = [], isLoading } = useQuery({ queryKey: ['incidents'], queryFn: () => fetch('/api/incidents').then(r => r.json()) })

  const addIncident = useMutation({
    mutationFn: (data: any) => fetch('/api/incidents', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }); toast.success('Awaria zgłoszona! Manager powiadomiony.'); setShowAdd(false) }
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="font-display text-2xl text-[#F5F0E8]">Zgłoś awarię</h1><p className="text-sm text-[#6B7A8D] mt-0.5">Awarie sprzętu i problemy techniczne</p></div>
        <button className="btn btn-gold" onClick={() => setShowAdd(true)}><Plus size={14}/> Nowe zgłoszenie</button>
      </div>

      {!Array.isArray(incidents) || incidents.length === 0 ? (
        <EmptyState icon="🔧" text="Brak zgłoszeń" sub="Brak historii awarii" />
      ) : (
        <div className="space-y-2">
          {incidents.map((inc: any) => (
            <div key={inc.id} className="card p-4 flex items-start gap-4">
              <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${inc.status === 'RESOLVED' || inc.status === 'CLOSED' ? 'bg-green-400' : inc.priority === 'HIGH' || inc.priority === 'URGENT' ? 'bg-red-400' : 'bg-orange-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-[#E8ECF0]">{inc.device}</div>
                <div className="text-xs text-[#9AAAB8] mt-0.5">{inc.description}</div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant={priorityVariant[inc.priority] || 'gray'} className="text-[10px]">{inc.priority}</Badge>
                  <span className="text-xs text-[#6B7A8D]">{inc.category}</span>
                  <span className="text-xs text-[#6B7A8D]">{new Date(inc.createdAt).toLocaleDateString('pl-PL')}</span>
                </div>
              </div>
              <Badge variant={statusVariant[inc.status] || 'gray'}>{statusLabel[inc.status] || inc.status}</Badge>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nowe zgłoszenie awarii">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Kategoria</label>
            <select className="input" value={form.category} onChange={e => setForm(p=>({...p, category:e.target.value}))}>
              <option>Awaria urządzenia</option><option>Uszkodzenie mechaniczne</option><option>Problem z instalacją</option><option>Problem z IT</option><option>Inne</option>
            </select></div>
          <div><label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Urządzenie / Miejsce</label>
            <select className="input" value={form.device} onChange={e => setForm(p=>({...p, device:e.target.value}))}>
              <option>Ekspres do kawy</option><option>Lodówka główna</option><option>Lodówka wystawowa</option><option>Terminal płatniczy</option><option>Zmywarka</option><option>Piec</option><option>Klimatyzacja</option><option>Inne</option>
            </select></div>
          <div><label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Priorytet</label>
            <select className="input" value={form.priority} onChange={e => setForm(p=>({...p, priority:e.target.value}))}>
              <option value="URGENT">🔴 Krytyczny — zatrzymuje pracę</option>
              <option value="HIGH">🟠 Wysoki — utrudnia pracę</option>
              <option value="MEDIUM">🟡 Średni — nie blokuje</option>
              <option value="LOW">🟢 Niski — do planowego naprawienia</option>
            </select></div>
          <div><label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Opis problemu *</label>
            <textarea className="input" rows={3} placeholder="Opisz dokładnie co się stało..." value={form.description} onChange={e => setForm(p=>({...p, description:e.target.value}))} /></div>
          <div className="flex gap-3">
            <button className="btn btn-ghost flex-1" onClick={() => setShowAdd(false)}>Anuluj</button>
            <button className="btn btn-gold flex-1" disabled={!form.description} onClick={() => addIncident.mutate(form)}>Wyślij zgłoszenie</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
