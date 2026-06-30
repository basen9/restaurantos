'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'

const PAY_LABELS: Record<string, string> = { CASH: 'Gotówka', CARD: 'Karta', BLIK: 'BLIK', ONLINE: 'Online', OTHER: 'Inna', NIEZNANA: 'Nieznana' }

export default function InsightsPage() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useQuery({ queryKey: ['sales-report', days], queryFn: () => fetch(`/api/reports/sales?days=${days}`).then((r) => r.json()) })
  const { data: voids } = useQuery({ queryKey: ['voids', days], queryFn: () => fetch(`/api/reports/voids?days=${days}`).then((r) => r.json()) })
  const { data: servers } = useQuery({ queryKey: ['servers', days], queryFn: () => fetch(`/api/reports/servers?days=${days}`).then((r) => r.json()) })
  if (isLoading) return <PageLoader />
  const r = data || {}
  const hasData = (r.transactions || 0) > 0

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl text-[#F5F0E8]">Raporty sprzedaży</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">Bestsellery, godziny szczytu, metody płatności</p>
        </div>
        <select className="input w-36" value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
          <option value={7}>7 dni</option>
          <option value={30}>30 dni</option>
          <option value={90}>90 dni</option>
        </select>
      </div>

      {!hasData ? <EmptyState icon="📊" text="Brak sprzedaży w okresie" sub="Zamknij rachunki na sali, aby zobaczyć raporty" /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <StatCard label="Przychód brutto" value={`${r.revenue} zł`} accent="gold" />
            <StatCard label="VAT" value={`${r.vatTotal ?? 0} zł`} sub={`netto ${(Math.round((r.revenue - (r.vatTotal || 0)) * 100) / 100)} zł`} />
            <StatCard label="Transakcje" value={r.transactions} sub={`śr. paragon ${r.avgTicket} zł`} />
            <StatCard label="Napiwki" value={`${r.tips} zł`} accent="green" />
            <StatCard label="Rabaty" value={`${r.discounts} zł`} accent={r.discounts > 0 ? 'red' : undefined} />
          </div>

          {Array.isArray(r.vatByRate) && r.vatByRate.length > 0 && (
            <div className="card p-5 mb-6">
              <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-3">Rozbicie VAT (księgowość)</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {r.vatByRate.map((v: any) => (
                  <div key={v.rate} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="text-sm font-semibold text-[#E8ECF0]">Stawka {v.rate}%</div>
                    <div className="text-xs text-[#6B7A8D] mt-1">Netto: <span className="text-[#E8ECF0]">{v.net} zł</span></div>
                    <div className="text-xs text-[#6B7A8D]">VAT: <span className="text-[#E8B923]">{v.vat} zł</span></div>
                    <div className="text-xs text-[#6B7A8D]">Brutto: <span className="text-[#E8ECF0]">{v.gross} zł</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-5 mb-6">
            <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-3">Sprzedaż wg godziny</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={r.byHour}>
                <XAxis dataKey="hour" stroke="#6B7A8D" fontSize={11} />
                <YAxis stroke="#6B7A8D" fontSize={11} />
                <Tooltip contentStyle={{ background: '#1A1D27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Bar dataKey="revenue" fill="#E8B923" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {voids && voids.count > 0 && (
            <div className="card p-5 mb-6" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest">Storna (kontrola strat)</div>
                <Badge variant="red">{voids.count} szt · {voids.totalValue} zł</Badge>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {voids.rows.slice(0, 10).map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between text-xs">
                    <span className="text-[#9AAAB8] truncate">{v.quantity}× {v.name}{v.reason ? ` — ${v.reason}` : ''}</span>
                    <span className="text-red-400 flex-shrink-0">{v.amount} zł</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {servers && servers.rows?.length > 0 && (
            <div className="card p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest">Wyniki kelnerów</div>
                <Badge variant="gray">napiwki: {servers.tipModel === 'pooled' ? 'wspólna pula' : 'indywidualne'}</Badge>
              </div>
              <div className="space-y-1.5">
                {servers.rows.map((r: any) => (
                  <div key={r.serverId} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <span className="text-sm text-[#E8ECF0] truncate">{r.name}</span>
                    <span className="text-xs text-[#9AAAB8] flex-shrink-0">{r.sales} rach. · {r.revenue} zł · śr. {r.avgTicket} zł · napiwki {r.tips} zł</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-5">
              <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-3">Bestsellery</div>
              <div className="space-y-1.5">
                {r.bestSellers.map((b: any, i: number) => (
                  <div key={b.name} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <span className="text-sm text-[#E8ECF0] truncate"><span className="text-[#6B7A8D] mr-1.5">{i + 1}.</span>{b.name}</span>
                    <span className="text-xs text-[#9AAAB8] flex-shrink-0">{b.qty} szt · {b.revenue} zł</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-3">Metody płatności</div>
              <div className="space-y-1.5">
                {r.paymentBreakdown.map((p: any) => (
                  <div key={p.method} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <span className="text-sm text-[#E8ECF0]">{PAY_LABELS[p.method] || p.method}</span>
                    <span className="text-xs text-[#9AAAB8]">{p.count} transakcji · {p.total} zł</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
