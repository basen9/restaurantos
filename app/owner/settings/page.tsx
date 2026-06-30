'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const jsonOk = (r: Response) => { if (!r.ok) return r.json().then((e) => { throw new Error(e.error || 'Błąd') }); return r.json() }

export default function SettingsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => fetch('/api/settings').then((r) => r.json()) })
  const [s, setS] = useState<any>(null)
  useEffect(() => { if (data) setS(data) }, [data])

  const save = useMutation({
    mutationFn: (body: any) => fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(jsonOk),
    onSuccess: () => { toast.success('Ustawienia zapisane'); qc.invalidateQueries({ queryKey: ['settings'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading || !s) return <PageLoader />
  const num = (k: string) => (e: any) => setS((p: any) => ({ ...p, [k]: parseFloat(e.target.value) || 0 }))
  const bool = (k: string) => (e: any) => setS((p: any) => ({ ...p, [k]: e.target.checked }))
  const Row = ({ label, hint, children }: any) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/5">
      <div><div className="text-sm text-[#E8ECF0]">{label}</div>{hint && <div className="text-xs text-[#6B7A8D] mt-0.5">{hint}</div>}</div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Ustawienia</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Wszystkie decyzje systemu — zmienialne tutaj</p>
      </div>

      <div className="card p-5 mb-4">
        <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-1">Sprzedaż i podatki</div>
        <Row label="Waluta"><input className="input w-24 text-right" value={s.currency} onChange={(e) => setS((p: any) => ({ ...p, currency: e.target.value }))} /></Row>
        <Row label="Domyślny VAT (%)" hint="dla nowych pozycji menu"><input className="input w-24 text-right" type="number" value={s.defaultVatRate} onChange={num('defaultVatRate')} /></Row>
        <Row label="Opłata serwisowa (%)" hint="0 = wyłączona"><input className="input w-24 text-right" type="number" value={s.serviceChargePct} onChange={num('serviceChargePct')} /></Row>
      </div>

      <div className="card p-5 mb-4">
        <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-1">Napiwki i kasa</div>
        <Row label="Model napiwków">
          <select className="input" value={s.tipModel} onChange={(e) => setS((p: any) => ({ ...p, tipModel: e.target.value }))}>
            <option value="individual">Indywidualny</option>
            <option value="pooled">Wspólna pula</option>
          </select>
        </Row>
        <Row label="Napiwki gotówkowe w szufladzie" hint="wliczaj do oczekiwanej gotówki"><input type="checkbox" checked={s.cashTipsInDrawer} onChange={bool('cashTipsInDrawer')} /></Row>
      </div>

      <div className="card p-5 mb-4">
        <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-1">Obsługa i kontrola</div>
        <Row label="Storno wymaga managera" hint="anulowanie pozycji tylko z uprawnieniem"><input type="checkbox" checked={s.voidRequiresManager} onChange={bool('voidRequiresManager')} /></Row>
        <Row label="Próg wolnej obsługi (min)"><input className="input w-24 text-right" type="number" value={s.slowServiceMinutes} onChange={num('slowServiceMinutes')} /></Row>
        <Row label="Rezerwacje włączone"><input type="checkbox" checked={s.reservationsEnabled} onChange={bool('reservationsEnabled')} /></Row>
      </div>

      <div className="card p-5 mb-4">
        <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-1">Program lojalnościowy</div>
        <Row label="Lojalność włączona"><input type="checkbox" checked={s.loyaltyEnabled} onChange={bool('loyaltyEnabled')} /></Row>
        <Row label="Punkty za 1 zł" hint="naliczane od wartości rachunku"><input className="input w-24 text-right" type="number" step="0.1" value={s.loyaltyPointsPerCurrency} onChange={num('loyaltyPointsPerCurrency')} /></Row>
        <Row label="Wartość 1 punktu (zł)" hint="przy wymianie"><input className="input w-24 text-right" type="number" step="0.01" value={s.loyaltyRedeemValue} onChange={num('loyaltyRedeemValue')} /></Row>
      </div>

      <button className="btn btn-gold" disabled={save.isPending} onClick={() => save.mutate(s)}>{save.isPending ? 'Zapisywanie…' : 'Zapisz ustawienia'}</button>
    </div>
  )
}
