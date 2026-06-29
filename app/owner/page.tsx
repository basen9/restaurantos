'use client'
import { useQuery } from '@tanstack/react-query'
import { StatCard } from '@/components/ui/StatCard'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export default function ManagerDashboard() {
  const { data: analytics, isLoading } = useQuery({ queryKey: ['analytics'], queryFn: () => fetch('/api/analytics').then(r => r.json()) })
  const { data: vacations = [] } = useQuery({ queryKey: ['vacations-all'], queryFn: () => fetch('/api/vacations').then(r => r.json()) })
  const { data: incidents = [] } = useQuery({ queryKey: ['incidents-all'], queryFn: () => fetch('/api/incidents').then(r => r.json()) })

  if (isLoading) return <PageLoader />

  const pendingVacs = Array.isArray(vacations) ? vacations.filter((v:any) => v.status === 'PENDING') : []
  const openIncidents = Array.isArray(incidents) ? incidents.filter((i:any) => i.status === 'OPEN') : []
  const wasteData = analytics?.wasteByProduct || []

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl text-[#F5F0E8]">Panel Managera</h1>
        <p className="text-sm text-[#6B7A8D] mt-1">Przegląd operacyjny · Kraków Rynek</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pracownicy" value={analytics?.totalEmployees || 0} sub="aktywnych" />
        <StatCard label="Straty w m-cu" value={`${(analytics?.wasteThisMonth || 0).toFixed(0)} zł`} sub="bieżący miesiąc" accent="red" />
        <StatCard label="Otwarte awarie" value={analytics?.openIncidents || 0} sub="wymaga uwagi" accent={analytics?.openIncidents > 0 ? 'red' : undefined} />
        <StatCard label="Wnioski urlopowe" value={analytics?.pendingVacations || 0} sub="do zatwierdzenia" accent={analytics?.pendingVacations > 0 ? 'gold' : undefined} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Waste chart */}
        <div className="card p-5">
          <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-4">Top straty wg produktu</div>
          {wasteData.length === 0 ? (
            <div className="text-center py-8 text-sm text-[#6B7A8D]">Brak danych o stratach</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={wasteData.map((w:any) => ({ name: w.product.slice(0,12), value: w._sum.totalCost }))} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fill: '#6B7A8D', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7A8D', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1A1D27', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: '#E8ECF0' }} />
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {wasteData.map((_:any, i:number) => <Cell key={i} fill={i === 0 ? '#EF4444' : i === 1 ? '#F97316' : '#E8B923'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quick links */}
        <div className="card p-5">
          <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-4">Do zatwierdzenia</div>
          {pendingVacs.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-[#6B7A8D] mb-2">Urlopy ({pendingVacs.length})</div>
              {pendingVacs.slice(0,3).map((v:any) => (
                <Link key={v.id} href="/owner/vacations" className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all">
                  <span className="text-sm text-[#E8ECF0]">{v.user?.name}</span>
                  <div className="flex items-center gap-2"><Badge variant="orange" className="text-[10px]">{v.days} dni</Badge><ChevronRight size={12} className="text-[#6B7A8D]" /></div>
                </Link>
              ))}
            </div>
          )}
          {openIncidents.length > 0 && (
            <div>
              <div className="text-xs text-[#6B7A8D] mb-2">Otwarte awarie ({openIncidents.length})</div>
              {openIncidents.slice(0,3).map((inc:any) => (
                <Link key={inc.id} href="/owner/incidents" className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all">
                  <span className="text-sm text-[#E8ECF0]">{inc.device}</span>
                  <div className="flex items-center gap-2"><Badge variant="red" className="text-[10px]">Otwarte</Badge><ChevronRight size={12} className="text-[#6B7A8D]" /></div>
                </Link>
              ))}
            </div>
          )}
          {pendingVacs.length === 0 && openIncidents.length === 0 && (
            <div className="text-center py-8 text-sm text-[#6B7A8D]">Wszystko zatwierdzone ✓</div>
          )}
        </div>
      </div>
    </div>
  )
}
