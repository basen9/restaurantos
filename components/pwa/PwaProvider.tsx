'use client'
import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

// Rejestruje service worker i pokazuje dyskretny przycisk instalacji PWA
// (Android/desktop). Na iOS instalacja odbywa się przez „Dodaj do ekranu początkowego".
export function PwaProvider() {
  const [deferred, setDeferred] = useState<any>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    const onPrompt = (e: any) => {
      e.preventDefault()
      setDeferred(e)
      if (!localStorage.getItem('pwa-dismissed')) setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null); setShow(false)
  }
  const dismiss = () => { setShow(false); try { localStorage.setItem('pwa-dismissed', '1') } catch {} }

  if (!show) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-fade-in"
         style={{ background: '#1A1D27', border: '1px solid rgba(232,185,35,0.3)' }}>
      <span className="text-sm text-[#E8ECF0]">Zainstaluj RestaurantOS jako aplikację</span>
      <button className="btn btn-gold py-1.5 px-3 text-xs" onClick={install}><Download size={13} /> Zainstaluj</button>
      <button aria-label="Zamknij" className="text-[#6B7A8D] hover:text-[#E8ECF0]" onClick={dismiss}><X size={15} /></button>
    </div>
  )
}
