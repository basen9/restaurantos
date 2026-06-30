'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { translate, DEFAULT_LANG, type Lang } from '@/lib/i18n/dictionaries'

interface I18nCtx { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string }
const Ctx = createContext<I18nCtx>({ lang: DEFAULT_LANG, setLang: () => {}, t: (k) => k })

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('lang') as Lang | null
      if (saved) setLangState(saved)
    } catch {}
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem('lang', l) } catch {}
    if (typeof document !== 'undefined') document.documentElement.lang = l
  }, [])

  const t = useCallback((key: string) => translate(lang, key), [lang])
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

// Hook tłumaczeń: const t = useT(); t('nav.dashboard')
export function useT() {
  return useContext(Ctx).t
}
export function useLang() {
  const { lang, setLang } = useContext(Ctx)
  return { lang, setLang }
}
