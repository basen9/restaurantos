'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, X, ChefHat } from 'lucide-react'

const fcVariant = (pct: number | null) => pct == null ? 'gray' : pct > 35 ? 'red' : pct > 28 ? 'orange' : 'green'

export default function RecipesPage() {
  const qc = useQueryClient()
  const { data: recipes = [], isLoading } = useQuery({ queryKey: ['recipes'], queryFn: () => fetch('/api/recipes').then(r => r.json()) })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => fetch('/api/products').then(r => r.json()) })
  const { data: stock = [] } = useQuery({ queryKey: ['inventory-items'], queryFn: () => fetch('/api/inventory-items').then(r => r.json()) })

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ productId: '', yield: '1' })
  const [ings, setIngs] = useState<any[]>([])
  const [ingRow, setIngRow] = useState({ inventoryItemId: '', quantity: '', unit: 'kg' })

  const create = useMutation({
    mutationFn: (d: any) => fetch('/api/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error || 'err') }); return r.json() }),
    onSuccess: () => { toast.success('Receptura zapisana'); setShowAdd(false); setForm({ productId: '', yield: '1' }); setIngs([]); qc.invalidateQueries({ queryKey: ['recipes'] }); qc.invalidateQueries({ queryKey: ['analytics'] }) },
    onError: (e: any) => toast.error(e.message || 'Błąd'),
  })

  if (isLoading) return <PageLoader />
  const list = Array.isArray(recipes) ? recipes : []
  const usedProductIds = new Set(list.map((r: any) => r.productId))
  const availableProducts = (products || []).filter((p: any) => !usedProductIds.has(p.id))
  const avg = list.filter((r: any) => r.foodCostPct != null)
  const avgFc = avg.length ? Math.round(avg.reduce((s: number, r: any) => s + r.foodCostPct, 0) / avg.length) : null

  const addIng = () => {
    if (!ingRow.inventoryItemId || !ingRow.quantity) return
    const item = (stock || []).find((s: any) => s.id === ingRow.inventoryItemId)
    setIngs(p => [...p, { ...ingRow, quantity: parseFloat(ingRow.quantity), unit: item?.unit || ingRow.unit, name: item?.name }])
    setIngRow({ inventoryItemId: '', quantity: '', unit: 'kg' })
  }

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl text-[#F5F0E8]">Receptury i food cost</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">Koszt składników, marża i food cost % każdego wyrobu</p>
        </div>
        <button className="btn btn-gold" onClick={() => setShowAdd(true)}><Plus size={14} /> Receptura</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Średni food cost" value={avgFc != null ? `${avgFc}%` : '—'} sub="z receptur" accent={avgFc != null && avgFc > 35 ? 'red' : 'green'} />
        <StatCard label="Receptury" value={list.length} sub="zdefiniowane" />
        <StatCard label="Bez receptury" value={availableProducts.length} sub="produktów" accent={availableProducts.length > 0 ? 'gold' : undefined} />
      </div>

      {list.length === 0 ? <EmptyState icon="👨‍🍳" text="Brak receptur" sub="Dodaj recepturę, aby liczyć food cost i marżę" /> : (
        <div className="space-y-3">
          {list.map((r: any) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-[#E8ECF0] flex items-center gap-2"><ChefHat size={15} className="text-[#6B7A8D]" /> {r.product?.name}</div>
                <Badge variant={fcVariant(r.foodCostPct)}>{r.foodCostPct != null ? `Food cost ${r.foodCostPct}%` : 'Brak ceny'}</Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#6B7A8D] mb-2 flex-wrap">
                <span>Koszt: <span className="text-[#E8ECF0]">{r.costPerUnit} zł</span></span>
                <span>Cena: <span className="text-[#E8ECF0]">{r.price || '—'} zł</span></span>
                {r.marginPct != null && <span>Marża: <span className="text-green-400">{r.marginPct}%</span></span>}
                <span>Wydajność: {r.yield} szt</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(r.items || []).map((it: any) => (
                  <span key={it.id} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: '#9AAAB8' }}>{it.inventoryItem?.name} {it.quantity}{it.unit}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nowa receptura">
        <div className="space-y-3">
          <select className="input" value={form.productId} onChange={e => setForm(p => ({ ...p, productId: e.target.value }))}>
            <option value="">Wybierz produkt…</option>
            {availableProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name}{p.price ? ` (${p.price} zł)` : ' (brak ceny)'}</option>)}
          </select>
          <input className="input" type="number" min="1" placeholder="Wydajność (ile szt z receptury)" value={form.yield} onChange={e => setForm(p => ({ ...p, yield: e.target.value }))} />

          <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider pt-1">Składniki</div>
          <div className="flex gap-2">
            <select className="input flex-1" value={ingRow.inventoryItemId} onChange={e => setIngRow(p => ({ ...p, inventoryItemId: e.target.value }))}>
              <option value="">Składnik z magazynu…</option>
              {(stock || []).map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.costPerUnit} zł/{s.unit})</option>)}
            </select>
            <input className="input w-24" type="number" placeholder="Ilość" value={ingRow.quantity} onChange={e => setIngRow(p => ({ ...p, quantity: e.target.value }))} />
            <button className="btn btn-ghost" onClick={addIng}><Plus size={14} /></button>
          </div>
          {ings.length > 0 && (
            <div className="space-y-1.5">
              {ings.map((it, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="text-sm text-[#E8ECF0]">{it.name}</span>
                  <div className="flex items-center gap-2"><span className="text-xs text-[#9AAAB8]">{it.quantity} {it.unit}</span><button onClick={() => setIngs(p => p.filter((_, j) => j !== i))}><X size={13} className="text-[#6B7A8D]" /></button></div>
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-gold w-full" disabled={!form.productId || ings.length === 0 || create.isPending}
            onClick={() => create.mutate({ productId: form.productId, yield: parseInt(form.yield) || 1, items: ings.map(i => ({ inventoryItemId: i.inventoryItemId, quantity: i.quantity, unit: i.unit })) })}>
            {create.isPending ? 'Zapisywanie…' : 'Zapisz recepturę'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
