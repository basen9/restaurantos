'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { StatCard } from '@/components/ui/StatCard'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import Link from 'next/link'
import { ChevronRight, TrendingUp, TrendingDown, AlertTriangle, Plug, Sparkles, Trophy, ShoppingCart, Package } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const sevColor: Record<string, string> = { high: '#EF4444', medium: '#F97316', low: '#E8B923' }

function SectionLabel({ n, children, icon }: { n: number; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-[#0F1117]" style={{ background: '#E8B923' }}>{n}</span>
      {icon}
      <span className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest">{children}</span>
    </div>
  )
}

export default function OwnerDashboard() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [loc, setLoc] = useState('')
  const { data, isLoading } = useQuery({ queryKey: ['analytics', loc], queryFn: () => fetch(`/api/analytics${loc ? `?locationId=${loc}` : ''}`).then(r => r.json()), refetchInterval: 60000 })

  if (isLoading) return <PageLoader />

  const a = data || {}
  const decisions = a.decisions || []
  const topProducts = a.waste?.topProducts || []
  const locations = a.locations || []
  const maxLocScore = Math.max(1, ...locations.map((l: any) => l.score || 0))
  const dayName = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'][new Date().getDay()]
  const trend = a.waste?.trendPct

  return (
    <div className="animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-[#F5F0E8]">Centrum dowodzenia</h1>
          <p className="text-sm text-[#6B7A8D] mt-1">{dayName}, {formatDate(new Date())} · {user?.organizationName || 'Twój biznes'}</p>
        </div>
        <div className="flex items-center gap-2">
          {locations.length > 1 && (
            <select className="input w-auto text-xs py-1.5" value={loc} onChange={e => setLoc(e.target.value)}>
              <option value="">Wszystkie lokale</option>
              {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(232,185,35,0.1)', border: '1px solid rgba(232,185,35,0.3)', color: '#E8B923' }}>
            <Sparkles size={13} /> AI COO
          </div>
        </div>
      </div>

      {/* Q1 — ILE DZIŚ ZARABIAM (hero) */}
      <SectionLabel n={1} icon={<TrendingUp size={14} className="text-[#6B7A8D]" />}>Ile dziś zarabiam</SectionLabel>
      <div className="card p-5 mb-6 relative overflow-hidden" style={{ borderColor: 'rgba(232,185,35,0.15)' }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-[#6B7A8D] uppercase tracking-wider mb-1">Sprzedaż dziś</div>
            <div className="font-display text-3xl text-[#F5F0E8]">{a.finance?.salesToday != null ? `${a.finance.salesToday} zł` : '—'}</div>
            <div className="text-xs text-[#6B7A8D] mt-1">{a.finance?.posConnected ? 'na żywo' : 'wymaga POS'}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7A8D] uppercase tracking-wider mb-1">Zysk dziś (szac.)</div>
            <div className="font-display text-3xl text-[#F5F0E8]">{a.finance?.profitToday != null ? `${a.finance.profitToday} zł` : '—'}</div>
            <div className="text-xs text-[#6B7A8D] mt-1">sprzedaż − koszty</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7A8D] uppercase tracking-wider mb-1">Marża</div>
            <div className="font-display text-3xl text-[#F5F0E8]">{a.finance?.marginPct != null ? `${a.finance.marginPct}%` : '—'}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7A8D] uppercase tracking-wider mb-1">Food cost</div>
            <div className="font-display text-3xl text-[#F5F0E8]">{a.finance?.foodCostPct != null ? `${a.finance.foodCostPct}%` : '—'}</div>
          </div>
        </div>
        {!a.finance?.posConnected && (
          <Link href="/owner/analytics" className="mt-4 flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all" style={{ background: 'rgba(56,130,246,0.08)', border: '1px solid rgba(56,130,246,0.25)' }}>
            <Plug size={15} className="text-blue-400 flex-shrink-0" />
            <div className="flex-1 text-xs text-[#9AAAB8]">Podłącz POS, aby zobaczyć sprzedaż, zysk, marżę i food cost w czasie rzeczywistym.</div>
            <span className="text-xs font-semibold text-blue-400 whitespace-nowrap">Podłącz <ChevronRight size={12} className="inline" /></span>
          </Link>
        )}
      </div>

      {/* Q5 — SKRZYNKA DECYZJI (najpilniejsze) */}
      <SectionLabel n={5} icon={<Sparkles size={14} className="text-yellow-400" />}>Co wymaga natychmiastowej uwagi</SectionLabel>
      <div className="card p-5 mb-6" style={{ borderColor: 'rgba(232,185,35,0.2)' }}>
        {decisions.length === 0 ? (
          <div className="text-center py-6 text-sm text-[#6B7A8D]">Wszystko pod kontrolą — brak pilnych decyzji ✓</div>
        ) : (
          <div className="space-y-2">
            {decisions.map((d: any) => (
              <Link key={d.id} href={d.href} className="flex items-center gap-3 p-3 rounded-xl border-l-2 hover:bg-white/5 transition-all" style={{ borderColor: sevColor[d.severity], background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#E8ECF0]">{d.title}</div>
                  <div className="text-xs text-[#6B7A8D] mt-0.5">{d.detail}</div>
                </div>
                <span className="text-xs font-semibold whitespace-nowrap flex items-center gap-1" style={{ color: sevColor[d.severity] }}>{d.cta} <ChevronRight size={13} /></span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Q2 — GDZIE TRACĘ */}
        <div>
          <SectionLabel n={2} icon={<AlertTriangle size={14} className="text-[#6B7A8D]" />}>Gdzie tracę pieniądze</SectionLabel>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="card p-4">
              <div className="text-xs text-[#6B7A8D] uppercase tracking-wider mb-1">Straty dziś</div>
              <div className="text-2xl font-bold" style={{ color: (a.waste?.today || 0) > 50 ? '#EF4444' : '#F5F0E8' }}>{(a.waste?.today || 0).toFixed(0)} zł</div>
              {trend != null && (
                <div className="text-[11px] mt-1 flex items-center gap-1" style={{ color: trend > 0 ? '#EF4444' : '#22C55E' }}>
                  {trend > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {Math.abs(trend)}% vs wczoraj
                </div>
              )}
            </div>
            <StatCard label="7 dni" value={`${(a.waste?.week || 0).toFixed(0)} zł`} />
            <StatCard label="Miesiąc" value={`${(a.waste?.month || 0).toFixed(0)} zł`} accent="red" />
          </div>
          <div className="card p-5">
            <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-4">Top straty wg produktu (m-c)</div>
            {topProducts.length === 0 ? (
              <div className="text-center py-8 text-sm text-[#6B7A8D]">Brak danych o stratach</div>
            ) : (
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={topProducts.map((w: any) => ({ name: w.product.slice(0, 12), value: w.cost }))} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fill: '#6B7A8D', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B7A8D', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1A1D27', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: '#E8ECF0' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {topProducts.map((_: any, i: number) => <Cell key={i} fill={i === 0 ? '#EF4444' : i === 1 ? '#F97316' : '#E8B923'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Q3 — KTÓRY LOKAL NAJBARDZIEJ RENTOWNY */}
        <div>
          <SectionLabel n={3} icon={<Trophy size={14} className="text-[#6B7A8D]" />}>Który lokal działa najlepiej</SectionLabel>
          <div className="card p-5">
            {locations.length === 0 ? (
              <div className="text-center py-8 text-sm text-[#6B7A8D]">Brak lokali</div>
            ) : (
              <div className="space-y-3">
                {locations.map((l: any, i: number) => (
                  <div key={l.id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: i === 0 ? 'rgba(232,185,35,0.2)' : 'rgba(255,255,255,0.05)', color: i === 0 ? '#E8B923' : '#9AAAB8' }}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#E8ECF0] truncate">{l.name}</span>
                        <span className="text-xs font-semibold text-[#9AAAB8]">{l.score} pkt</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(l.score / maxLocScore) * 100}%`, background: i === 0 ? '#E8B923' : '#6B7A8D' }} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-[#6B7A8D] flex-wrap">
                        <span>💰 {l.revenueToday} zł dziś{l.marginPct != null ? ` · marża ${l.marginPct}%` : ''}</span>
                        <span>👥 {l.activeNow}/{l.headcount}</span>
                        <span>🗑️ {l.wasteMonth} zł</span>
                        {l.openIncidents > 0 && <span className="text-red-400">⚠️ {l.openIncidents}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-[10px] text-[#6B7A8D] pt-1 border-t border-white/5">Pełny ranking rentowności (przychód/marża) po integracji POS.</div>
              </div>
            )}
          </div>

          {/* Q4 — CO ZAMÓWIĆ DZIŚ */}
          <div className="mt-3">
            <SectionLabel n={4} icon={<ShoppingCart size={14} className="text-[#6B7A8D]" />}>Co powinienem dziś zamówić</SectionLabel>
            <div className="card p-5">
              {a.ordering?.configured && a.ordering.suggestions?.length ? (
                <div className="space-y-2">
                  {a.ordering.suggestions.map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <span className="text-sm text-[#E8ECF0]">{s.product}</span>
                      <span className="text-xs text-[#9AAAB8]">{s.quantity} {s.unit}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 text-xs text-[#9AAAB8]">
                  <Package size={20} className="text-[#6B7A8D] flex-shrink-0" />
                  <div>Skonfiguruj magazyn i poziomy minimalne, a system będzie codziennie podpowiadał, co i ile zamówić (z prognozą wyczerpania).</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Zespół i operacje */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Na zmianie teraz" value={a.team?.activeNow || 0} sub="aktywne zmiany" accent={(a.team?.activeNow || 0) > 0 ? 'green' : undefined} />
        <StatCard label="Zaplanowani dziś" value={a.team?.scheduledToday || 0} sub="zmiany dziś" />
        <StatCard label="Pracownicy" value={a.team?.totalEmployees || 0} sub="aktywnych" />
        <StatCard label="Otwarte zadania" value={a.attention?.openTasks || 0} sub="w toku" accent={(a.attention?.openTasks || 0) > 0 ? 'gold' : undefined} />
      </div>
    </div>
  )
}
