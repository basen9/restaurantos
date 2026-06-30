'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Clock, Users } from 'lucide-react'

const jsonOk = (r: Response) => { if (!r.ok) return r.json().then((e) => { throw new Error(e.error || 'Błąd') }); return r.json() }
const STATUS: Record<string, { label: string; variant: any }> = {
  PENDING: { label: 'Oczekuje', variant: 'orange' }, CONFIRMED: { label: 'Potwierdzona', variant: 'gold' },
  SEATED: { label: 'Posadzeni', variant: 'green' }, CANCELLED: { label: 'Anulowana', variant: 'gray' }, NO_SHOW: { label: 'Nie dotarli', variant: 'red' },
}
const today = () => new Date().toISOString().slice(0, 10)

export default function ReservationsPage() {
  const qc = useQueryClient()
  const [date, setDate] = useState(today())
  const { data: list = [], isLoading } = useQuery({ queryKey: ['reservations', date], queryFn: () => fetch(`/api/reservations?date=${date}`).then((r) => r.json()) })
  const [add, setAdd] = useState(false)
  const [form, setForm] = useState({ guestName: '', guestPhone: '', partySize: '2', time: '18:00', durationMin: '120', notes: '' })

  const refresh = () => qc.invalidateQueries({ queryKey: ['reservations'] })
  const create = useMutation({
    mutationFn: (body: any) => fetch('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(jsonOk),
    onSuccess: () => { toast.success('Rezerwacja dodana'); setAdd(false); setForm({ guestName: '', guestPhone: '', partySize: '2', time: '18:00', durationMin: '120', notes: '' }); refresh() },
    onError: (e: any) => toast.error(e.message),
  })
  const setStatus = useMutation({ mutationFn: ({ id, status }: any) => fetch(`/api/reservations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(jsonOk), onSuccess: refresh, onError: (e: any) => toast.error(e.message) })

  const submit = () => {
    const startsAt = new Date(`${date}T${form.time}:00`)
    create.mutate({ guestName: form.guestName, guestPhone: form.guestPhone || undefined, partySize: parseInt(form.partySize) || 2, startsAt, durationMin: parseInt(form.durationMin) || 120, notes: form.notes || undefined })
  }

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div><h1 className="font-display text-2xl text-[#F5F0E8]">Rezerwacje</h1><p className="text-sm text-[#6B7A8D] mt-0.5">Zarządzanie rezerwacjami stolików</p></div>
        <div className="flex gap-2">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn btn-gold" onClick={() => setAdd(true)}><Plus size={14} /> Rezerwacja</button>
        </div>
      </div>

      {isLoading ? <PageLoader /> : !Array.isArray(list) || list.length === 0 ? (
        <EmptyState icon="📅" text="Brak rezerwacji na ten dzień" sub="Dodaj pierwszą rezerwację" />
      ) : (
        <div className="space-y-2">
          {list.map((r: any) => (
            <div key={r.id} className="card p-4 flex items-center gap-4">
              <div className="text-center flex-shrink-0">
                <div className="text-lg font-display text-[#E8B923]">{new Date(r.startsAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="text-[11px] text-[#6B7A8D]">{r.durationMin} min</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#E8ECF0]">{r.guestName}</div>
                <div className="text-xs text-[#6B7A8D] flex items-center gap-2"><Users size={11} /> {r.partySize} os.{r.table ? ` · ${r.table.name}` : ''}{r.guestPhone ? ` · ${r.guestPhone}` : ''}</div>
                {r.notes && <div className="text-xs text-[#6B7A8D] italic mt-0.5">{r.notes}</div>}
              </div>
              <Badge variant={STATUS[r.status]?.variant}>{STATUS[r.status]?.label}</Badge>
              <select className="input text-xs py-1.5 w-auto" value={r.status} onChange={(e) => setStatus.mutate({ id: r.id, status: e.target.value })}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      <Modal open={add} onClose={() => setAdd(false)} title="Nowa rezerwacja">
        <div className="space-y-3">
          <input className="input" placeholder="Imię i nazwisko gościa" value={form.guestName} onChange={(e) => setForm((s) => ({ ...s, guestName: e.target.value }))} />
          <input className="input" placeholder="Telefon (opcjonalnie)" value={form.guestPhone} onChange={(e) => setForm((s) => ({ ...s, guestPhone: e.target.value }))} />
          <div className="grid grid-cols-3 gap-2">
            <div><label className="block text-xs text-[#6B7A8D] mb-1">Godzina</label><input type="time" className="input" value={form.time} onChange={(e) => setForm((s) => ({ ...s, time: e.target.value }))} /></div>
            <div><label className="block text-xs text-[#6B7A8D] mb-1">Osób</label><input type="number" min="1" className="input" value={form.partySize} onChange={(e) => setForm((s) => ({ ...s, partySize: e.target.value }))} /></div>
            <div><label className="block text-xs text-[#6B7A8D] mb-1">Czas (min)</label><input type="number" min="15" className="input" value={form.durationMin} onChange={(e) => setForm((s) => ({ ...s, durationMin: e.target.value }))} /></div>
          </div>
          <textarea className="input" rows={2} placeholder="Uwagi (opcjonalnie)" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
          <button className="btn btn-gold w-full" disabled={!form.guestName || create.isPending} onClick={submit}>{create.isPending ? 'Zapisywanie…' : 'Dodaj rezerwację'}</button>
        </div>
      </Modal>
    </div>
  )
}
