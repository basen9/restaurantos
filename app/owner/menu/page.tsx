'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Pencil, UtensilsCrossed } from 'lucide-react'

const jsonOk = (r: Response) => { if (!r.ok) return r.json().then((e) => { throw new Error(e.error || 'Błąd') }); return r.json() }
const empty = { name: '', category: '', unit: 'szt', price: '', costPerUnit: '', description: '', available: true }

export default function MenuPage() {
  const qc = useQueryClient()
  const { data: products = [], isLoading } = useQuery({ queryKey: ['products-all'], queryFn: () => fetch('/api/products').then((r) => r.json()) })
  const [edit, setEdit] = useState<any>(null)

  const save = useMutation({
    mutationFn: ({ id, ...body }: any) => fetch(id ? `/api/products/${id}` : '/api/products', { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(jsonOk),
    onSuccess: () => { toast.success('Zapisano'); setEdit(null); qc.invalidateQueries({ queryKey: ['products-all'] }); qc.invalidateQueries({ queryKey: ['products'] }) },
    onError: (e: any) => toast.error(e.message || 'Błąd'),
  })
  const toggle86 = useMutation({
    mutationFn: ({ id, available }: any) => fetch(`/api/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ available }) }).then(jsonOk),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products-all'] }); qc.invalidateQueries({ queryKey: ['products'] }) },
    onError: (e: any) => toast.error(e.message || 'Błąd'),
  })

  if (isLoading) return <PageLoader />
  const list = Array.isArray(products) ? products : []
  const byCat = list.reduce((acc: Record<string, any[]>, p: any) => { (acc[p.category] ||= []).push(p); return acc }, {})
  const unavailable = list.filter((p: any) => !p.available).length

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl text-[#F5F0E8]">Menu</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">Karta, ceny i dostępność ({list.length} pozycji{unavailable ? `, ${unavailable} „86"` : ''})</p>
        </div>
        <button className="btn btn-gold" onClick={() => setEdit({ ...empty })}><Plus size={14} /> Pozycja</button>
      </div>

      {list.length === 0 ? <EmptyState icon="🍽️" text="Brak pozycji w menu" sub="Dodaj pierwszą pozycję karty" /> : (
        <div className="space-y-6">
          {Object.entries(byCat).map(([cat, items]) => (
            <div key={cat}>
              <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-2">{cat}</div>
              <div className="space-y-2">
                {(items as any[]).map((p) => (
                  <div key={p.id} className="card p-3 flex items-center gap-3" style={{ opacity: p.available ? 1 : 0.55 }}>
                    <UtensilsCrossed size={15} className="text-[#6B7A8D] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#E8ECF0] flex items-center gap-2">{p.name}{!p.available && <Badge variant="red">86</Badge>}</div>
                      {p.description && <div className="text-xs text-[#6B7A8D] truncate">{p.description}</div>}
                    </div>
                    <div className="text-sm text-[#E8B923] font-semibold">{p.price?.toFixed ? p.price.toFixed(2) : p.price} zł</div>
                    <button className="btn btn-ghost py-1.5 px-2.5 text-xs" onClick={() => toggle86.mutate({ id: p.id, available: !p.available })}>{p.available ? 'Oznacz „86"' : 'Przywróć'}</button>
                    <button aria-label="Edytuj" className="btn btn-ghost py-1.5 px-2" onClick={() => setEdit({ id: p.id, name: p.name, category: p.category, unit: p.unit, price: String(p.price ?? ''), costPerUnit: String(p.costPerUnit ?? ''), description: p.description || '', available: p.available })}><Pencil size={13} /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edytuj pozycję' : 'Nowa pozycja menu'}>
        {edit && (
          <div className="space-y-3">
            <input className="input" placeholder="Nazwa" value={edit.name} onChange={(e) => setEdit((s: any) => ({ ...s, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Kategoria" value={edit.category} onChange={(e) => setEdit((s: any) => ({ ...s, category: e.target.value }))} />
              <input className="input" placeholder="Jednostka (szt)" value={edit.unit} onChange={(e) => setEdit((s: any) => ({ ...s, unit: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" type="number" step="0.01" placeholder="Cena (zł)" value={edit.price} onChange={(e) => setEdit((s: any) => ({ ...s, price: e.target.value }))} />
              <input className="input" type="number" step="0.01" placeholder="Koszt surowca (zł)" value={edit.costPerUnit} onChange={(e) => setEdit((s: any) => ({ ...s, costPerUnit: e.target.value }))} />
            </div>
            <textarea className="input" rows={2} placeholder="Opis (opcjonalnie)" value={edit.description} onChange={(e) => setEdit((s: any) => ({ ...s, description: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm text-[#9AAAB8]"><input type="checkbox" checked={edit.available} onChange={(e) => setEdit((s: any) => ({ ...s, available: e.target.checked }))} /> Dostępne do zamówienia</label>
            <button className="btn btn-gold w-full" disabled={!edit.name || !edit.category || save.isPending}
              onClick={() => save.mutate({ id: edit.id, name: edit.name, category: edit.category, unit: edit.unit || 'szt', price: parseFloat(edit.price) || 0, costPerUnit: parseFloat(edit.costPerUnit) || 0, description: edit.description || undefined, available: edit.available })}>
              {save.isPending ? 'Zapisywanie…' : 'Zapisz'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
