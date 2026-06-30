'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [needs2fa, setNeeds2fa] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await signIn('credentials', { email, password, token, redirect: false })
    setLoading(false)
    if (res?.error) {
      if (res.error === '2FA_REQUIRED') {
        setNeeds2fa(true)
        toast('Podaj kod uwierzytelniania dwuskładnikowego')
        return
      }
      if (res.error === '2FA_INVALID') {
        setNeeds2fa(true)
        toast.error('Nieprawidłowy kod 2FA')
        return
      }
      toast.error('Nieprawidłowy email lub hasło')
      return
    }
    toast.success('Zalogowano pomyślnie')
    // Routing po roli: root przekieruje OWNER → /owner, EMPLOYEE → /dashboard.
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-deep relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-5" style={{background: 'radial-gradient(circle, #E8B923, transparent)'}} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-5" style={{background: 'radial-gradient(circle, #3B82F6, transparent)'}} />
        {[...Array(20)].map((_,i) => (
          <div key={i} className="absolute w-px opacity-5" style={{
            left: `${(i/20)*100}%`, top: 0, bottom: 0,
            background: 'linear-gradient(to bottom, transparent, rgba(232,185,35,0.3), transparent)'
          }} />
        ))}
      </div>

      <div className="w-full max-w-md px-6 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
               style={{background: 'linear-gradient(135deg, rgba(232,185,35,0.2), rgba(232,185,35,0.05))', border: '1px solid rgba(232,185,35,0.3)'}}>
            <span className="text-3xl">☕</span>
          </div>
          <h1 className="font-display text-3xl text-[#F5F0E8] mb-2">RestaurantOS</h1>
          <p className="text-[#6B7A8D] text-sm">System zarządzania restauracją</p>
        </div>

        {/* Form */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-[#E8ECF0] mb-6">Zaloguj się</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-2">Email</label>
              <input type="email" className="input" placeholder="twój@email.pl"
                value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-2">Hasło</label>
              <input type="password" className="input" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {needs2fa && (
              <div>
                <label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-2">Kod 2FA</label>
                <input type="text" inputMode="numeric" autoComplete="one-time-code" className="input tracking-[0.4em] text-center"
                  placeholder="000000" value={token} onChange={e => setToken(e.target.value)} autoFocus required />
                <p className="text-[10px] text-[#6B7A8D] mt-1.5">Wpisz 6-cyfrowy kod z aplikacji uwierzytelniającej lub kod odzyskiwania.</p>
              </div>
            )}
            <button type="submit" className="btn btn-gold w-full justify-center py-3 text-sm mt-2" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Logowanie...</span>
              ) : 'Zaloguj się'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5">
            <p className="text-xs text-[#6B7A8D] font-semibold uppercase tracking-wider mb-3">Konta testowe:</p>
            <div className="space-y-2">
              {[
                { label: 'Właściciel', email: 'owner@restaurantos.pl', pass: 'owner123', color: '#A855F7' },
                { label: 'Manager', email: 'manager@restaurantos.pl', pass: 'manager123', color: '#E8B923' },
                { label: 'Pracownik', email: 'anna@restaurantos.pl', pass: 'anna123', color: '#3B82F6' },
              ].map(acc => (
                <button key={acc.email} onClick={() => { setEmail(acc.email); setPassword(acc.pass) }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all hover:bg-white/5"
                  style={{border: `1px solid ${acc.color}22`}}>
                  <span className="font-semibold" style={{color: acc.color}}>{acc.label}</span>
                  <span className="text-[#6B7A8D] ml-2">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
