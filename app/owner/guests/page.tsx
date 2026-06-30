'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Star, Phone } from 'lucide-react'

const jsonOk = (r: Response) => { if (!r.ok) return r.json().then((e) => { throw new Error(e.error || 'Błąd') }); return r.json() }

export default function GuestsPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const { data: guests = [], isLoading } = useQuery({ queryKey: ['guests', q], queryFn: () => fetch(`/api/guests?q=${encodeURIComponent(q)}`).then((r) => r.json()) })
  const [edit, setEdit] = useState<any>(null)

  const save = useMutation({
    mutationFn: ({ id, ...body }: any) => fetch(id ? `/api/guests/${id}` : '/api/guests', { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(jsonOk),
    onSuccess: () => { toast.success('Zapisano'); setEdit(null); qc.invalidateQueries({ queryKey: ['guests'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading) return <PageLoader />
  const list = Array.isArray(guests) ? guests : []

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div><h1 className="font-display text-2xl text-[#F5F0E8]">Goście (CRM)</h1><p className="text-sm text-[#6B7A8D] mt-0.5">Baza gości, punkty lojalnościowe i historia wizyt</p></div>
        <button className="btn btn-gold" onClick={() => setEdit({ name: '', phone: '', email: '', notes: '' })}><Plus size={14} /> Gość</button>
      </div>

      <input className="input mb-4" placeholder="Szukaj po nazwisku lub telefonie…" value={q} onChange={(e) => setQ(e.target.value)} />

      {list.length === 0 ? <EmptyState icon="🧑‍🤝‍🧑" text="Brak gości" sub="Dodaj pierwszego gościa lub przypisz przy stoliku" /> : (
        <div className="space-y-2">
          {list.map((g: any) => (
            <div key={g.id} className="card p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#E8ECF0]">{g.name}</div>
                <div className="text-xs text-[#6B7A8D] flex items-center gap-2">{g.phone && <span className="flex items-center gap-1"><Phone size={11} /> {g.phone}</span>}<span>{g.visits} wizyt · {Math.round(g.totalSpent)} zł</span></div>
              </div>
              <Badge variant="gold"><Star size={11} /> {g.points} pkt</Badge>
              <button className="btn btn-ghost py-1.5 px-2.5 text-xs" onClick={() => setEdit({ id: g.id, name: g.name, phone: g.phone || '', email: g.email || '', notes: g.notes || '' })}>Edytuj</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edytuj gościa' : 'Nowy gość'}>
        {edit && (
          <div className="space-y-3">
            <input className="input" placeholder="Imię i nazwisko" value={edit.name} onChange={(e) => setEdit((s: any) => ({ ...s, name: e.target.value }))} />
            <input className="input" placeholder="Telefon" value={edit.phone} onChange={(e) => setEdit((s: any) => ({ ...s, phone: e.target.value }))} />
            <input className="input" placeholder="E-mail" value={edit.email} onChange={(e) => setEdit((s: any) => ({ ...s, email: e.target.value }))} />
            <textarea className="input" rows={2} placeholder="Notatki (preferencje, alergie…)" value={edit.notes} onChange={(e) => setEdit((s: any) => ({ ...s, notes: e.target.value }))} />
            <button className="btn btn-gold w-full" disabled={!edit.name || save.isPending} onClick={() => save.mutate({ id: edit.id, name: edit.name, phone: edit.phone || undefined, email: edit.email || undefined, notes: edit.notes || undefined })}>{save.isPending ? 'Zapisywanie…' : 'Zapisz'}</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
