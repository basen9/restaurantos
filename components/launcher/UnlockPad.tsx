'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Delete, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

const PIN_MAX = 6

// Klawiatura PIN do błyskawicznego odblokowania (zaufane urządzenie / terminal POS).
export function UnlockPad({ shared, userName }: { shared: boolean; userName: string | null }) {
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function submit(value: string) {
    setBusy(true)
    const res = await signIn('credentials', { mode: 'pin', pin: value, redirect: false })
    setBusy(false)
    if (res?.error) { toast.error('Nieprawidłowy PIN'); setPin(''); return }
    router.push('/launcher'); router.refresh()
  }

  function press(d: string) {
    if (busy) return
    const next = (pin + d).slice(0, PIN_MAX)
    setPin(next)
    if (next.length === PIN_MAX) submit(next) // auto-submit przy 6 cyfrach
  }
  const back = () => !busy && setPin((p) => p.slice(0, -1))

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-deep px-6">
      <div className="w-full max-w-xs animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
               style={{ background: 'linear-gradient(135deg, rgba(232,185,35,0.2), rgba(232,185,35,0.05))', border: '1px solid rgba(232,185,35,0.3)' }}>
            <Lock size={22} className="text-yellow-400" />
          </div>
          <h1 className="font-display text-2xl text-[#F5F0E8]">{shared ? 'Wpisz swój PIN' : `Witaj${userName ? `, ${userName}` : ''}`}</h1>
          <p className="text-[#6B7A8D] text-sm mt-1">{shared ? 'Szybkie logowanie operatora' : 'Odblokuj PIN-em'}</p>
        </div>

        {/* Kropki postępu */}
        <div className="flex items-center justify-center gap-3 mb-8 h-4">
          {Array.from({ length: PIN_MAX }).map((_, i) => (
            <span key={i} className="w-3 h-3 rounded-full transition-all"
              style={{ background: i < pin.length ? '#E8B923' : 'rgba(255,255,255,0.12)' }} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} onClick={() => press(d)} disabled={busy}
              className="h-16 rounded-2xl text-2xl font-semibold text-[#E8ECF0] bg-white/5 hover:bg-white/10 active:scale-95 transition-all">
              {d}
            </button>
          ))}
          <div />
          <button onClick={() => press('0')} disabled={busy}
            className="h-16 rounded-2xl text-2xl font-semibold text-[#E8ECF0] bg-white/5 hover:bg-white/10 active:scale-95 transition-all">0</button>
          <button onClick={back} disabled={busy || !pin}
            className="h-16 rounded-2xl flex items-center justify-center text-[#9AAAB8] hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30">
            <Delete size={22} />
          </button>
        </div>

        <button onClick={() => router.push('/login')}
          className="w-full text-center text-xs text-[#6B7A8D] hover:text-[#E8ECF0] transition-all mt-8">
          Zaloguj się hasłem
        </button>
      </div>
    </div>
  )
}
