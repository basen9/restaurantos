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

const emptyGuest = { name: '', phone: '', email: '', notes: '', preferences: '', allergens: '', tags: '', birthday: '' }

export default function GuestsPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('')
  const [bdayMonth, setBdayMonth] = useState(false)
  const { data: guests = [], isLoading } = useQuery({ queryKey: ['guests', q, tag, bdayMonth], queryFn: () => fetch(`/api/guests?q=${encodeURIComponent(q)}&tag=${encodeURIComponent(tag)}${bdayMonth ? '&birthdayMonth=1' : ''}`).then((r) => r.json()) })
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
        <button className="btn btn-gold" onClick={() => setEdit({ ...emptyGuest })}><Plus size={14} /> Gość</button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input className="input flex-1 min-w-[160px]" placeholder="Szukaj po nazwisku lub telefonie…" value={q} onChange={(e) => setQ(e.target.value)} />
        <input className="input w-40" placeholder="Segment (tag)…" value={tag} onChange={(e) => setTag(e.target.value)} />
        <button className={`btn ${bdayMonth ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setBdayMonth((v) => !v)}>🎂 Urodziny</button>
      </div>

      {list.length === 0 ? <EmptyState icon="🧑‍🤝‍🧑" text="Brak gości" sub="Dodaj pierwszego gościa lub przypisz przy stoliku" /> : (
        <div className="space-y-2">
          {list.map((g: any) => (
            <div key={g.id} className="card p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#E8ECF0] flex items-center gap-2 flex-wrap">{g.name}{(g.tags || []).map((t: string) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-[#9AAAB8]">{t}</span>)}</div>
                <div className="text-xs text-[#6B7A8D] flex items-center gap-2 flex-wrap">{g.phone && <span className="flex items-center gap-1"><Phone size={11} /> {g.phone}</span>}<span>{g.visits} wizyt · {Math.round(g.totalSpent)} zł</span>{g.birthday && <span>🎂 {new Date(g.birthday).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}</span>}{(g.allergens || []).length > 0 && <span className="text-orange-300">⚠ {g.allergens.join(', ')}</span>}</div>
              </div>
              <Badge variant="gold"><Star size={11} /> {g.points} pkt</Badge>
              <button className="btn btn-ghost py-1.5 px-2.5 text-xs" onClick={() => setEdit({ id: g.id, name: g.name, phone: g.phone || '', email: g.email || '', notes: g.notes || '', preferences: g.preferences || '', allergens: (g.allergens || []).join(', '), tags: (g.tags || []).join(', '), birthday: g.birthday ? new Date(g.birthday).toISOString().slice(0, 10) : '' })}>Edytuj</button>
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
            <div className="grid grid-cols-2 gap-2">
              <div><label className="block text-xs text-[#6B7A8D] mb-1">Urodziny</label><input type="date" className="input" value={edit.birthday} onChange={(e) => setEdit((s: any) => ({ ...s, birthday: e.target.value }))} /></div>
              <div><label className="block text-xs text-[#6B7A8D] mb-1">Tagi (segmenty)</label><input className="input" placeholder="VIP, stały" value={edit.tags} onChange={(e) => setEdit((s: any) => ({ ...s, tags: e.target.value }))} /></div>
            </div>
            <input className="input" placeholder="Alergeny (po przecinku)" value={edit.allergens} onChange={(e) => setEdit((s: any) => ({ ...s, allergens: e.target.value }))} />
            <textarea className="input" rows={2} placeholder="Preferencje (ulubiony stolik, podanie…)" value={edit.preferences} onChange={(e) => setEdit((s: any) => ({ ...s, preferences: e.target.value }))} />
            <textarea className="input" rows={2} placeholder="Notatki" value={edit.notes} onChange={(e) => setEdit((s: any) => ({ ...s, notes: e.target.value }))} />
            <button className="btn btn-gold w-full" disabled={!edit.name || save.isPending} onClick={() => save.mutate({ id: edit.id, name: edit.name, phone: edit.phone || undefined, email: edit.email || undefined, notes: edit.notes || undefined, preferences: edit.preferences || undefined, allergens: edit.allergens ? edit.allergens.split(',').map((x: string) => x.trim()).filter(Boolean) : [], tags: edit.tags ? edit.tags.split(',').map((x: string) => x.trim()).filter(Boolean) : [], birthday: edit.birthday || '' })}>{save.isPending ? 'Zapisywanie…' : 'Zapisz'}</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
