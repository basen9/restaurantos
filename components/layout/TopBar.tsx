'use client'
import { useSession, signOut } from 'next-auth/react'
import { Bell, LogOut, ChevronDown, Menu, Globe } from 'lucide-react'
import { useState } from 'react'
import { getInitials } from '@/lib/utils'
import Link from 'next/link'
import { useLang, useT } from '@/components/i18n/I18nProvider'
import { LANGUAGES } from '@/lib/i18n/dictionaries'

export function TopBar({ notifCount = 0, shiftActive = false, shiftElapsed = '', onMenu }: {
  notifCount?: number; shiftActive?: boolean; shiftElapsed?: string; onMenu?: () => void
}) {
  const { data: session } = useSession()
  const user = session?.user as any
  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const { lang, setLang } = useLang()
  const t = useT()

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-white/5" style={{background: '#1A1D27'}}>
      {/* Left: mobile menu + shift status */}
      <div className="flex items-center gap-3">
        <button onClick={onMenu} aria-label="Otwórz menu"
          className="md:hidden p-2 -ml-2 rounded-lg text-[#9AAAB8] hover:text-[#E8ECF0] hover:bg-white/5 transition-all">
          <Menu size={18} />
        </button>
        {shiftActive ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
               style={{background: 'rgba(232,185,35,0.1)', border: '1px solid rgba(232,185,35,0.3)', color: '#E8B923'}}>
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse-gold" />
            Zmiana aktywna
            {shiftElapsed && <span className="font-normal opacity-70">· {shiftElapsed}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-[#6B7A8D]"
               style={{border: '1px solid rgba(255,255,255,0.07)'}}>
            <span className="w-2 h-2 rounded-full bg-[#6B7A8D]" />
            Poza zmianą
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button onClick={() => setLangOpen(!langOpen)} aria-label={t('common.language')}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[#6B7A8D] hover:text-[#E8ECF0] hover:bg-white/5 transition-all">
            <Globe size={16} />
            <span className="text-xs font-semibold uppercase">{lang}</span>
          </button>
          {langOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 card py-1 z-50 shadow-xl" onClick={() => setLangOpen(false)}>
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => setLang(l.code)}
                  className={`flex items-center justify-between w-full px-3 py-2 text-xs transition-all hover:bg-white/5 ${lang === l.code ? 'text-yellow-400 font-semibold' : 'text-[#E8ECF0]'}`}>
                  <span>{l.label}</span>
                  <span className="uppercase text-[10px] text-[#6B7A8D]">{l.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Link href="/notifications" aria-label="Powiadomienia" className="relative p-2 rounded-lg text-[#6B7A8D] hover:text-[#E8ECF0] hover:bg-white/5 transition-all">
          <Bell size={17} />
          {notifCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{notifCount > 9 ? '9+' : notifCount}</span>
          )}
        </Link>

        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-[#0F1117]"
                 style={{background: 'linear-gradient(135deg, #E8B923, #C49A1A)'}}>
              {getInitials(user?.name || 'U')}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-[#E8ECF0] leading-tight">{user?.name}</div>
              <div className="text-[10px] text-[#6B7A8D] leading-tight">{user?.position || user?.role}</div>
            </div>
            <ChevronDown size={13} className="text-[#6B7A8D]" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 card py-1 z-50 shadow-xl" onClick={() => setMenuOpen(false)}>
              <div className="px-3 py-2 border-b border-white/5 mb-1">
                <div className="text-xs font-semibold text-[#E8ECF0]">{user?.name}</div>
                <div className="text-[10px] text-[#6B7A8D]">{user?.email}</div>
              </div>
              <button onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-white/5 transition-all">
                <LogOut size={13} /> {t('common.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
