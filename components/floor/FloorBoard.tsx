'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Trash2, Users, Clock, Receipt, History, ChevronUp, ChevronDown, Utensils, Wine } from 'lucide-react'

const STATUS: Record<string, { label: string; variant: any; next?: string }> = {
  PENDING: { label: 'Oczekuje', variant: 'gray', next: 'PREPARING' },
  PREPARING: { label: 'W przygotowaniu', variant: 'orange', next: 'READY' },
  READY: { label: 'Gotowe', variant: 'gold', next: 'SERVED' },
  SERVED: { label: 'Wydane', variant: 'green' },
}
const jsonOk = (r: Response) => { if (!r.ok) return r.json().then((e) => { throw new Error(e.error || 'Błąd') }); return r.json() }

export function FloorBoard({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient()
  const { data: zones = [], isLoading } = useQuery({ queryKey: ['floor'], queryFn: () => fetch('/api/floor').then((r) => r.json()), refetchInterval: 8000 })
  const { data: locations = [] } = useQuery({ queryKey: ['locations'], queryFn: () => fetch('/api/locations').then((r) => r.json()), enabled: canManage })
  const [active, setActive] = useState<{ id: string; name: string } | null>(null)
  const [newZone, setNewZone] = useState('')
  const [tableForm, setTableForm] = useState<Record<string, string>>({})

  const addZone = useMutation({ mutationFn: (name: string) => fetch('/api/zones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }).then(jsonOk), onSuccess: () => { setNewZone(''); qc.invalidateQueries({ queryKey: ['floor'] }) } })
  const delZone = useMutation({ mutationFn: (id: string) => fetch(`/api/zones/${id}`, { method: 'DELETE' }).then(jsonOk), onSuccess: () => qc.invalidateQueries({ queryKey: ['floor'] }) })
  const moveZone = useMutation({ mutationFn: ({ id, sortOrder }: any) => fetch(`/api/zones/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sortOrder }) }).then(jsonOk), onSuccess: () => qc.invalidateQueries({ queryKey: ['floor'] }) })
  const addTable = useMutation({ mutationFn: ({ zoneId, name }: any) => fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zoneId, name }) }).then(jsonOk), onSuccess: () => qc.invalidateQueries({ queryKey: ['floor'] }) })
  const delTable = useMutation({ mutationFn: (id: string) => fetch(`/api/tables/${id}`, { method: 'DELETE' }).then(jsonOk), onSuccess: () => qc.invalidateQueries({ queryKey: ['floor'] }) })

  if (isLoading) return <PageLoader />
  const list = Array.isArray(zones) ? zones : []

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl text-[#F5F0E8]">Plan sali</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">{canManage ? 'Strefy, stoliki i rachunki w czasie rzeczywistym' : 'Stoliki i rachunki w czasie rzeczywistym'}</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <input className="input w-44" placeholder="Nazwa strefy…" value={newZone} onChange={(e) => setNewZone(e.target.value)} />
            <button className="btn btn-gold" disabled={!newZone.trim() || addZone.isPending} onClick={() => addZone.mutate(newZone.trim())}><Plus size={14} /> Strefa</button>
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState icon="🍽️" text="Brak stref" sub={canManage ? 'Dodaj pierwszą strefę (np. Sala główna, Taras)' : 'Właściciel nie skonfigurował jeszcze planu sali'} />
      ) : (
        <div className="space-y-6">
          {list.map((z: any, zi: number) => (
            <div key={z.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg text-[#F5F0E8]">{z.name}</h2>
                  <span className="text-xs text-[#6B7A8D]">({z.tables.length} stolików)</span>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button aria-label="W górę" className="btn btn-ghost p-1.5" disabled={zi === 0} onClick={() => moveZone.mutate({ id: z.id, sortOrder: zi - 1 })}><ChevronUp size={14} /></button>
                    <button aria-label="W dół" className="btn btn-ghost p-1.5" disabled={zi === list.length - 1} onClick={() => moveZone.mutate({ id: z.id, sortOrder: zi + 1 })}><ChevronDown size={14} /></button>
                    <button aria-label="Usuń strefę" className="btn btn-ghost p-1.5 text-red-400" onClick={() => { if (confirm(`Usunąć strefę „${z.name}" wraz ze stolikami?`)) delZone.mutate(z.id) }}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {z.tables.map((t: any) => {
                  const late = t.summary?.oldestUnservedMin != null && t.summary.oldestUnservedMin >= 20
                  return (
                    <button key={t.id} onClick={() => setActive({ id: t.id, name: t.name })}
                      className="rounded-xl p-3 text-left transition-all border"
                      style={{ background: t.occupied ? 'rgba(232,185,35,0.08)' : 'rgba(255,255,255,0.02)', borderColor: late ? 'rgba(239,68,68,0.5)' : t.occupied ? 'rgba(232,185,35,0.3)' : 'rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#E8ECF0]">{t.name}</span>
                        <span className="text-[11px] text-[#6B7A8D] flex items-center gap-0.5"><Users size={11} /> {t.seats}</span>
                      </div>
                      {t.occupied ? (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs text-[#E8B923] font-semibold">{t.summary.total.toFixed(2)} zł</div>
                          <div className="text-[11px] text-[#9AAAB8]">{t.summary.itemCount} poz.{t.summary.oldestUnservedMin != null && <span className={late ? 'text-red-400' : ''}> · {t.summary.oldestUnservedMin} min</span>}</div>
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-[#6B7A8D]">Wolny</div>
                      )}
                    </button>
                  )
                })}
                {canManage && (
                  <div className="rounded-xl p-2 border border-dashed flex flex-col gap-1" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <input className="input text-xs py-1" placeholder="Nr stolika" value={tableForm[z.id] || ''} onChange={(e) => setTableForm((p) => ({ ...p, [z.id]: e.target.value }))} />
                    <button className="btn btn-ghost text-xs py-1" disabled={!(tableForm[z.id] || '').trim()} onClick={() => { addTable.mutate({ zoneId: z.id, name: tableForm[z.id].trim() }); setTableForm((p) => ({ ...p, [z.id]: '' })) }}><Plus size={12} /> Stolik</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {active && <OrderPanel table={active} canManage={canManage} onClose={() => setActive(null)} onDeleteTable={canManage ? (id) => { if (confirm('Usunąć stolik?')) { delTable.mutate(id); setActive(null) } } : undefined} />}
    </div>
  )
}

function OrderPanel({ table, canManage, onClose, onDeleteTable }: { table: { id: string; name: string }; canManage: boolean; onClose: () => void; onDeleteTable?: (id: string) => void }) {
  const qc = useQueryClient()
  const [showHistory, setShowHistory] = useState(false)
  const [item, setItem] = useState({ productId: '', name: '', kind: 'FOOD', quantity: '1', unitPrice: '' })
  const { data: order, isLoading } = useQuery({ queryKey: ['order', table.id], queryFn: () => fetch(`/api/tables/${table.id}/order`).then((r) => r.json()), refetchInterval: 5000 })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => fetch('/api/products').then((r) => r.json()) })
  const { data: history = [] } = useQuery({ queryKey: ['order-history', table.id], queryFn: () => fetch(`/api/orders?tableId=${table.id}`).then((r) => r.json()), enabled: showHistory })

  const refresh = () => { qc.invalidateQueries({ queryKey: ['order', table.id] }); qc.invalidateQueries({ queryKey: ['floor'] }) }
  const add = useMutation({ mutationFn: (body: any) => fetch(`/api/tables/${table.id}/order`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(jsonOk), onSuccess: () => { setItem({ productId: '', name: '', kind: 'FOOD', quantity: '1', unitPrice: '' }); refresh() } })
  const setStatus = useMutation({ mutationFn: ({ id, status }: any) => fetch(`/api/order-items/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(jsonOk), onSuccess: () => refresh() })
  const close = useMutation({ mutationFn: (id: string) => fetch(`/api/orders/${id}/close`, { method: 'POST' }).then(jsonOk), onSuccess: () => { toast.success('Rachunek zamknięty — sprzedaż zapisana'); refresh(); onClose() } })

  const onPickProduct = (id: string) => {
    const p = (products || []).find((x: any) => x.id === id)
    setItem((s) => ({ ...s, productId: id, name: p?.name || s.name, unitPrice: p?.price ? String(p.price) : s.unitPrice }))
  }
  const submitItem = () => {
    if (!item.name.trim()) return
    add.mutate({ items: [{ productId: item.productId || undefined, name: item.name.trim(), kind: item.kind, quantity: parseInt(item.quantity) || 1, unitPrice: parseFloat(item.unitPrice) || 0 }] })
  }

  const items = order?.items || []
  const total = items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0)
  const now = Date.now()

  return (
    <Modal open onClose={onClose} title={`Stolik ${table.name}`} size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost text-xs py-1.5" onClick={() => setShowHistory((s) => !s)}><History size={13} /> {showHistory ? 'Ukryj historię' : 'Historia'}</button>
          {onDeleteTable && <button className="btn btn-ghost text-xs py-1.5 text-red-400" onClick={() => onDeleteTable(table.id)}><Trash2 size={13} /> Usuń stolik</button>}
        </div>

        {showHistory && (
          <div className="card p-3 space-y-1.5 max-h-40 overflow-y-auto">
            {(Array.isArray(history) ? history : []).length === 0 ? <div className="text-xs text-[#6B7A8D]">Brak zamkniętych rachunków.</div> :
              history.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between text-xs">
                  <span className="text-[#9AAAB8]">{o.closedAt ? new Date(o.closedAt).toLocaleString('pl-PL') : ''}</span>
                  <span className="text-[#E8ECF0]">{o.total.toFixed(2)} zł · {o.items.length} poz.</span>
                </div>
              ))}
          </div>
        )}

        {isLoading ? <div className="text-sm text-[#6B7A8D]">Ładowanie…</div> : (
          <>
            {items.length === 0 ? (
              <div className="text-sm text-[#6B7A8D] py-2">Stolik wolny — dodaj pierwszą pozycję, aby otworzyć rachunek.</div>
            ) : (
              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                {items.map((i: any) => {
                  const st = STATUS[i.status]
                  const ageMin = Math.floor((now - new Date(i.createdAt).getTime()) / 60000)
                  return (
                    <div key={i.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      {i.kind === 'DRINK' ? <Wine size={14} className="text-[#6B7A8D] flex-shrink-0" /> : <Utensils size={14} className="text-[#6B7A8D] flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#E8ECF0] truncate">{i.quantity}× {i.name}</div>
                        <div className="text-[11px] text-[#6B7A8D] flex items-center gap-1"><Clock size={10} /> {ageMin} min · {(i.quantity * i.unitPrice).toFixed(2)} zł</div>
                      </div>
                      <Badge variant={st.variant}>{st.label}</Badge>
                      {st.next && <button className="btn btn-ghost text-[11px] py-1 px-2" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: i.id, status: st.next })}>→ {STATUS[st.next].label}</button>}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Dodawanie pozycji */}
            <div className="card p-3 space-y-2">
              <div className="text-xs font-semibold text-[#9AAAB8] uppercase tracking-wider">Dodaj pozycję</div>
              <select className="input" value={item.productId} onChange={(e) => onPickProduct(e.target.value)}>
                <option value="">Z menu / produktu… (lub wpisz ręcznie)</option>
                {(products || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}{p.price ? ` — ${p.price} zł` : ''}</option>)}
              </select>
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="Nazwa pozycji" value={item.name} onChange={(e) => setItem((s) => ({ ...s, name: e.target.value, productId: '' }))} />
                <select className="input w-28" value={item.kind} onChange={(e) => setItem((s) => ({ ...s, kind: e.target.value }))}>
                  <option value="FOOD">Jedzenie</option>
                  <option value="DRINK">Picie</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input className="input w-20" type="number" min="1" placeholder="Ilość" value={item.quantity} onChange={(e) => setItem((s) => ({ ...s, quantity: e.target.value }))} />
                <input className="input flex-1" type="number" step="0.01" placeholder="Cena szt. (zł)" value={item.unitPrice} onChange={(e) => setItem((s) => ({ ...s, unitPrice: e.target.value }))} />
                <button className="btn btn-gold" disabled={!item.name.trim() || add.isPending} onClick={submitItem}><Plus size={14} /></button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div className="text-sm text-[#6B7A8D]">Razem: <span className="text-lg font-display text-[#E8B923]">{total.toFixed(2)} zł</span></div>
              <button className="btn btn-gold" disabled={!order?.id || items.length === 0 || close.isPending} onClick={() => order?.id && close.mutate(order.id)}><Receipt size={14} /> {close.isPending ? 'Zamykanie…' : 'Zamknij rachunek'}</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
