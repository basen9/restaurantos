'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import { Camera, Plus, Loader2 } from 'lucide-react'

export default function WastePage() {
  const qc = useQueryClient()
  const [scanning, setScanning] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)
  const [form, setForm] = useState({ product: '', quantity: 1, unit: 'szt', reason: 'Przekroczony termin ważności', notes: '' })
  const [reason, setReason] = useState('')

  const { data: waste = [], isLoading } = useQuery({ queryKey: ['waste'], queryFn: () => fetch('/api/waste').then(r => r.json()) })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => fetch('/api/products').then(r => r.json()) })

  const addWaste = useMutation({
    mutationFn: (data: any) => fetch('/api/waste', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['waste'] }); toast.success('Strata zapisana') }
  })

  const simulateScan = async () => {
    setScanning(true); setAiResult(null)
    await new Promise(r => setTimeout(r, 1800))
    setAiResult([
      { product: 'Croissant maślany', quantity: 3, unit: 'szt', costPerUnit: 6, totalCost: 18 },
      { product: 'Sernik nowojorski', quantity: 0.5, unit: '%', costPerUnit: 25, totalCost: 12.5 },
      { product: 'Brownie czekoladowe', quantity: 2, unit: 'szt', costPerUnit: 7, totalCost: 14 },
    ])
    setScanning(false)
    toast.success('AI rozpoznał 3 produkty w stratach')
  }

  const confirmAiWaste = async () => {
    if (!aiResult) return
    for (const item of aiResult) {
      await addWaste.mutateAsync({ ...item, reason: reason || 'Przekroczony termin ważności', aiDetected: true })
    }
    setAiResult(null)
    toast.success(`Straty zapisane: ${aiResult.reduce((s:number,i:any) => s+i.totalCost, 0).toFixed(2)} zł`)
  }

  const todayWaste = Array.isArray(waste) ? waste.filter((w: any) => new Date(w.date).toDateString() === new Date().toDateString()) : []
  const todayCost = todayWaste.reduce((s: number, w: any) => s + (w.totalCost || 0), 0)

  if (isLoading) return <PageLoader />

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Zgłoś stratę</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Użyj AI Vision lub wprowadź ręcznie</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Scan */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest">Skan AI</div>
            <Badge variant="purple">✨ AI Vision</Badge>
          </div>

          {!aiResult ? (
            <button onClick={simulateScan} disabled={scanning}
              className="w-full border-2 border-dashed border-white/10 rounded-xl p-10 flex flex-col items-center gap-3 transition-all hover:border-yellow-400/30 hover:bg-yellow-400/5 cursor-pointer">
              {scanning ? (
                <><Loader2 size={40} className="text-yellow-400 animate-spin opacity-60" /><div className="text-sm font-medium text-yellow-400">AI analizuje zdjęcie...</div></>
              ) : (
                <><Camera size={40} className="text-[#6B7A8D]" /><div className="text-sm font-semibold text-[#9AAAB8]">Kliknij aby zrobić zdjęcie</div><div className="text-xs text-[#6B7A8D]">AI automatycznie rozpozna produkty i ilości</div></>
              )}
            </button>
          ) : (
            <div>
              <div className="rounded-xl p-4 mb-4" style={{background:'rgba(232,185,35,0.08)',border:'1px solid rgba(232,185,35,0.2)'}}>
                <div className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-3">✨ AI rozpoznał:</div>
                {aiResult.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between py-2 border-b border-yellow-400/10 last:border-0 text-sm">
                    <span className="text-[#E8ECF0]">{item.product} × {item.quantity} {item.unit}</span>
                    <span className="text-red-400 font-semibold">− {item.totalCost.toFixed(2)} zł</span>
                  </div>
                ))}
                <div className="flex justify-between pt-3 font-bold">
                  <span className="text-[#F5F0E8]">Łącznie:</span>
                  <span className="text-red-400">− {aiResult.reduce((s:number,i:any)=>s+i.totalCost,0).toFixed(2)} zł</span>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Powód straty</label>
                <select className="input" value={reason} onChange={e => setReason(e.target.value)}>
                  <option>Przekroczony termin ważności</option><option>Wada produktu</option>
                  <option>Błąd przygotowania</option><option>Uszkodzenie mechaniczne</option><option>Inne</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-ghost flex-1 text-xs" onClick={() => setAiResult(null)}>Anuluj</button>
                <button className="btn btn-gold flex-1 text-xs" onClick={confirmAiWaste}>Potwierdź i zapisz</button>
              </div>
            </div>
          )}
        </div>

        {/* Manual form */}
        <div className="card p-5">
          <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-4">Wprowadź ręcznie</div>
          <div className="space-y-3">
            <div><label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Produkt</label>
              <select className="input" value={form.product} onChange={e => {
                const p = Array.isArray(products) ? products.find((x:any) => x.name === e.target.value) : null
                setForm(prev => ({...prev, product: e.target.value, unit: (p as any)?.unit || 'szt'}))
              }}>
                <option value="">Wybierz produkt...</option>
                {Array.isArray(products) && products.map((p:any) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Ilość</label>
                <input type="number" className="input" min={0} step={0.5} value={form.quantity} onChange={e => setForm(p=>({...p, quantity: parseFloat(e.target.value)}))} /></div>
              <div><label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Jednostka</label>
                <select className="input" value={form.unit} onChange={e => setForm(p=>({...p, unit:e.target.value}))}>
                  <option>szt</option><option>kg</option><option>%</option><option>l</option>
                </select></div>
            </div>
            <div><label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Powód</label>
              <select className="input" value={form.reason} onChange={e => setForm(p=>({...p, reason:e.target.value}))}>
                <option>Przekroczony termin ważności</option><option>Wada produktu</option>
                <option>Błąd przygotowania</option><option>Uszkodzenie mechaniczne</option><option>Inne</option>
              </select></div>
            <div><label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Uwagi</label>
              <input className="input" placeholder="Opcjonalnie..." value={form.notes} onChange={e => setForm(p=>({...p, notes:e.target.value}))} /></div>
            <button className="btn btn-gold w-full justify-center" disabled={!form.product}
              onClick={() => addWaste.mutate({...form, costPerUnit: 0, totalCost: 0})}>
              Zapisz stratę
            </button>
          </div>
        </div>
      </div>

      {/* Today's waste */}
      <div className="card p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest">Straty dziś</div>
          <div className="text-sm font-bold text-red-400">{todayCost.toFixed(2)} zł</div>
        </div>
        {todayWaste.length === 0 ? (
          <div className="text-center py-6 text-sm text-[#6B7A8D]">Brak strat dziś 🎉</div>
        ) : (
          <div className="space-y-1">
            {todayWaste.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="text-sm text-[#E8ECF0]">{w.product}</div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-[#6B7A8D]">{w.quantity} {w.unit}</span>
                  <span className="text-sm font-medium text-red-400">− {(w.totalCost||0).toFixed(2)} zł</span>
                  {w.aiDetected && <Badge variant="purple" className="text-[9px]">AI</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
