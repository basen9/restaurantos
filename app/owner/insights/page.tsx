'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'

const PAY_LABELS: Record<string, string> = { CASH: 'Gotówka', CARD: 'Karta', BLIK: 'BLIK', ONLINE: 'Online', OTHER: 'Inna', NIEZNANA: 'Nieznana' }

export default function InsightsPage() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useQuery({ queryKey: ['sales-report', days], queryFn: () => fetch(`/api/reports/sales?days=${days}`).then((r) => r.json()) })
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Przychód" value={`${r.revenue} zł`} accent="gold" />
            <StatCard label="Transakcje" value={r.transactions} sub={`śr. paragon ${r.avgTicket} zł`} />
            <StatCard label="Napiwki" value={`${r.tips} zł`} accent="green" />
            <StatCard label="Rabaty" value={`${r.discounts} zł`} accent={r.discounts > 0 ? 'red' : undefined} />
          </div>

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
