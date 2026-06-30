'use client'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { LogOut, ShieldCheck, ChevronRight, Sparkles } from 'lucide-react'
import type { PlatformModule } from '@/lib/modules'

export function Launcher({ userName, modules, deviceTrusted }: {
  userName: string; modules: PlatformModule[]; deviceTrusted: boolean
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-deep px-6 py-10 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #E8B923, transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #3B82F6, transparent)' }} />
      </div>

      <div className="w-full max-w-3xl animate-fade-in relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
               style={{ background: 'linear-gradient(135deg, rgba(232,185,35,0.2), rgba(232,185,35,0.05))', border: '1px solid rgba(232,185,35,0.3)' }}>
            <span className="text-2xl">☕</span>
          </div>
          <h1 className="font-display text-3xl text-[#F5F0E8]">RestaurantOS</h1>
          <p className="text-[#6B7A8D] text-sm mt-1">Witaj, {userName} — wybierz moduł</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map((m) => (
            <Link key={m.key} href={m.href}
              className="group card p-5 flex items-center gap-4 hover:bg-white/5 transition-all"
              style={{ borderColor: `${m.accent}33` }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                   style={{ background: `${m.accent}1A`, color: m.accent, border: `1px solid ${m.accent}40` }}>
                {m.label.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#E8ECF0]">{m.label}</div>
                <div className="text-xs text-[#6B7A8D] mt-0.5">{m.description}</div>
              </div>
              <ChevronRight size={18} className="text-[#6B7A8D] group-hover:text-[#E8ECF0] transition-all flex-shrink-0" />
            </Link>
          ))}
        </div>

        {!deviceTrusted && (
          <Link href="/security"
            className="mt-5 flex items-center gap-3 rounded-xl px-4 py-3 transition-all hover:bg-white/5"
            style={{ background: 'rgba(232,185,35,0.06)', border: '1px solid rgba(232,185,35,0.25)' }}>
            <Sparkles size={16} className="text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-[#E8ECF0]">Zaufaj temu urządzeniu i ustaw PIN</div>
              <div className="text-[11px] text-[#6B7A8D]">Następnym razem zalogujesz się błyskawicznie PIN-em lub biometrią.</div>
            </div>
            <ChevronRight size={16} className="text-yellow-400" />
          </Link>
        )}

        <div className="flex items-center justify-center gap-4 mt-8 text-xs">
          <Link href="/security" className="flex items-center gap-1.5 text-[#6B7A8D] hover:text-[#E8ECF0] transition-all">
            <ShieldCheck size={14} /> Bezpieczeństwo i urządzenia
          </Link>
          <span className="text-white/10">·</span>
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-1.5 text-[#6B7A8D] hover:text-red-400 transition-all">
            <LogOut size={14} /> Wyloguj
          </button>
        </div>
      </div>
    </div>
  )
}
