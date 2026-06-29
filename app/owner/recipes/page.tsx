'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, X, ChefHat, BookOpen } from 'lucide-react'

const fcVariant = (pct: number | null) => pct == null ? 'gray' : pct > 35 ? 'red' : pct > 28 ? 'orange' : 'green'
const ACCESS_LABELS: Record<string, string> = { OWNER_ONLY: 'Tylko właściciel', OWNER_MANAGER: 'Właściciel + manager', ALL_COOKS: 'Wszyscy kucharze', SELECTED: 'Wybrane osoby' }

export default function RecipesPage() {
  const qc = useQueryClient()
  const { data: recipes = [], isLoading } = useQuery({ queryKey: ['recipes'], queryFn: () => fetch('/api/recipes').then(r => r.json()) })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => fetch('/api/products').then(r => r.json()) })
  const { data: stock = [] } = useQuery({ queryKey: ['inventory-items'], queryFn: () => fetch('/api/inventory-items').then(r => r.json()) })
  const { data: analytics } = useQuery({ queryKey: ['analytics'], queryFn: () => fetch('/api/analytics').then(r => r.json()) })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => fetch('/api/users').then(r => r.json()) })

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ productId: '', yield: '1' })
  const [ings, setIngs] = useState<any[]>([])
  const [ingRow, setIngRow] = useState({ inventoryItemId: '', quantity: '', unit: 'kg' })

  // Edytor pełnego przepisu kulinarnego + dostępu.
  const [guide, setGuide] = useState<any>(null)
  const saveGuide = useMutation({
    mutationFn: ({ id, ...body }: any) => fetch(`/api/recipes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error || 'err') }); return r.json() }),
    onSuccess: () => { toast.success('Pełny przepis zapisany'); setGuide(null); qc.invalidateQueries({ queryKey: ['recipes'] }) },
    onError: (e: any) => toast.error(e.message || 'Błąd'),
  })
  const employees = (Array.isArray(users) ? users : []).filter((u: any) => u.role === 'EMPLOYEE')
  const toggleAccessUser = (uid: string) => setGuide((g: any) => ({ ...g, accessUserIds: (g.accessUserIds || []).includes(uid) ? g.accessUserIds.filter((x: string) => x !== uid) : [...(g.accessUserIds || []), uid] }))

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

      {/* Wariancja food cost — detektor strat/nadprodukcji */}
      {Array.isArray(analytics?.foodCostVariance) && analytics.foodCostVariance.length > 0 && (
        <div className="card p-5 mb-6" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
          <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-1">Wariancja zużycia (m-c)</div>
          <div className="text-[11px] text-[#6B7A8D] mb-3">Rzeczywiste zużycie magazynu vs wynikające ze sprzedaży. Dodatnia = możliwa nadprodukcja, straty lub błędy porcjowania.</div>
          <div className="space-y-1.5">
            {analytics.foodCostVariance.map((v: any) => (
              <div key={v.inventoryItemId} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <span className="text-sm text-[#E8ECF0]">{v.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#6B7A8D]">sprzedaż {v.theoretical} {v.unit} · magazyn {v.actual} {v.unit}</span>
                  <Badge variant={v.varianceCost > 30 ? 'red' : 'orange'}>+{v.variance} {v.unit} (~{v.varianceCost} zł)</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <span className="text-[11px] text-[#6B7A8D]">Pełny przepis: <span className="text-[#9AAAB8]">{ACCESS_LABELS[r.fullRecipeAccess] || '—'}</span>{r.instructions ? ' · uzupełniony' : ' · pusty'}</span>
                <button className="btn btn-ghost py-1.5 px-2.5 text-xs" onClick={() => setGuide({ id: r.id, name: r.product?.name, instructions: r.instructions || '', prepTimeMin: r.prepTimeMin || '', chefTips: r.chefTips || '', cookNotes: r.cookNotes || '', allergens: (r.allergens || []).join(', '), fullRecipeAccess: r.fullRecipeAccess || 'OWNER_ONLY', accessUserIds: r.accessUserIds || [] })}><BookOpen size={13} /> Pełny przepis</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!guide} onClose={() => setGuide(null)} title={`Pełny przepis: ${guide?.name || ''}`} size="lg">
        {guide && (
          <div className="space-y-3">
            <div><label className="block text-xs font-semibold text-[#9AAAB8] uppercase tracking-wider mb-1.5">Przygotowanie krok po kroku</label>
              <textarea className="input" rows={5} placeholder="1. ...&#10;2. ..." value={guide.instructions} onChange={e => setGuide((g: any) => ({ ...g, instructions: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-[#9AAAB8] uppercase tracking-wider mb-1.5">Czas przygotowania (min)</label>
                <input className="input" type="number" min="0" value={guide.prepTimeMin} onChange={e => setGuide((g: any) => ({ ...g, prepTimeMin: e.target.value }))} /></div>
              <div><label className="block text-xs font-semibold text-[#9AAAB8] uppercase tracking-wider mb-1.5">Alergeny (po przecinku)</label>
                <input className="input" placeholder="gluten, jaja, mleko" value={guide.allergens} onChange={e => setGuide((g: any) => ({ ...g, allergens: e.target.value }))} /></div>
            </div>
            <div><label className="block text-xs font-semibold text-[#9AAAB8] uppercase tracking-wider mb-1.5">Wskazówki dla kucharzy</label>
              <textarea className="input" rows={2} value={guide.chefTips} onChange={e => setGuide((g: any) => ({ ...g, chefTips: e.target.value }))} /></div>
            <div><label className="block text-xs font-semibold text-[#9AAAB8] uppercase tracking-wider mb-1.5">Notatki</label>
              <textarea className="input" rows={2} value={guide.cookNotes} onChange={e => setGuide((g: any) => ({ ...g, cookNotes: e.target.value }))} /></div>
            <div><label className="block text-xs font-semibold text-[#9AAAB8] uppercase tracking-wider mb-1.5">Kto widzi pełny przepis</label>
              <select className="input" value={guide.fullRecipeAccess} onChange={e => setGuide((g: any) => ({ ...g, fullRecipeAccess: e.target.value }))}>
                {Object.entries(ACCESS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            {guide.fullRecipeAccess === 'SELECTED' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[28vh] overflow-y-auto">
                {employees.map((u: any) => (
                  <button key={u.id} onClick={() => toggleAccessUser(u.id)} className="flex items-center gap-2 p-2 rounded-lg text-left text-sm" style={{ background: (guide.accessUserIds || []).includes(u.id) ? 'rgba(232,185,35,0.1)' : 'transparent', color: (guide.accessUserIds || []).includes(u.id) ? '#E8ECF0' : '#9AAAB8' }}>
                    <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0" style={{ borderColor: (guide.accessUserIds || []).includes(u.id) ? '#E8B923' : 'rgba(255,255,255,0.2)', background: (guide.accessUserIds || []).includes(u.id) ? '#E8B923' : 'transparent' }}>{(guide.accessUserIds || []).includes(u.id) && <span className="text-[#0F1117] text-[10px]">✓</span>}</div>
                    {u.name}
                  </button>
                ))}
              </div>
            )}
            <button className="btn btn-gold w-full" disabled={saveGuide.isPending}
              onClick={() => saveGuide.mutate({ id: guide.id, instructions: guide.instructions || undefined, prepTimeMin: guide.prepTimeMin ? parseInt(guide.prepTimeMin) : undefined, chefTips: guide.chefTips || undefined, cookNotes: guide.cookNotes || undefined, allergens: guide.allergens ? guide.allergens.split(',').map((s: string) => s.trim()).filter(Boolean) : [], fullRecipeAccess: guide.fullRecipeAccess, accessUserIds: guide.fullRecipeAccess === 'SELECTED' ? guide.accessUserIds : [] })}>
              {saveGuide.isPending ? 'Zapisywanie…' : 'Zapisz pełny przepis'}
            </button>
          </div>
        )}
      </Modal>

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
