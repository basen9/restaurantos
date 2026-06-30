'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { ShieldCheck, ShieldAlert, KeyRound, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

const jsonOk = (r: Response) => { if (!r.ok) return r.json().then((e) => { throw new Error(e.error || 'Błąd') }); return r.json() }

export default function SecurityPage() {
  const qc = useQueryClient()
  const { data: status, isLoading } = useQuery({ queryKey: ['2fa'], queryFn: () => fetch('/api/2fa').then(jsonOk) })
  const [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(null)
  const [token, setToken] = useState('')
  const [recovery, setRecovery] = useState<string[] | null>(null)
  const [disablePass, setDisablePass] = useState('')
  const [disableToken, setDisableToken] = useState('')

  const startSetup = useMutation({
    mutationFn: () => fetch('/api/2fa/setup', { method: 'POST' }).then(jsonOk),
    onSuccess: (d) => { setSetup(d); setRecovery(null) },
    onError: (e: any) => toast.error(e.message),
  })
  const enable = useMutation({
    mutationFn: () => fetch('/api/2fa/enable', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }).then(jsonOk),
    onSuccess: (d) => { setRecovery(d.recoveryCodes); setSetup(null); setToken(''); toast.success('2FA włączone'); qc.invalidateQueries({ queryKey: ['2fa'] }) },
    onError: (e: any) => toast.error(e.message),
  })
  const disable = useMutation({
    mutationFn: () => fetch('/api/2fa/disable', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: disablePass, token: disableToken }) }).then(jsonOk),
    onSuccess: () => { setDisablePass(''); setDisableToken(''); toast.success('2FA wyłączone'); qc.invalidateQueries({ queryKey: ['2fa'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  // --- Tożsamość 2.0: zaufane urządzenia + PIN szybkiego logowania ---
  const { data: devices = [] } = useQuery({ queryKey: ['devices'], queryFn: () => fetch('/api/devices').then(jsonOk) })
  const [newPin, setNewPin] = useState('')
  const [curPin, setCurPin] = useState('')
  const trustDevice = useMutation({
    mutationFn: (shared: boolean) => fetch('/api/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shared }) }).then(jsonOk),
    onSuccess: () => { toast.success('Urządzenie zaufane'); qc.invalidateQueries({ queryKey: ['devices'] }) },
    onError: (e: any) => toast.error(e.message),
  })
  const revokeDevice = useMutation({
    mutationFn: (id: string) => fetch(`/api/devices/${id}`, { method: 'DELETE' }).then(jsonOk),
    onSuccess: () => { toast.success('Zaufanie odwołane'); qc.invalidateQueries({ queryKey: ['devices'] }) },
    onError: (e: any) => toast.error(e.message),
  })
  const savePin = useMutation({
    mutationFn: () => fetch('/api/auth/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: newPin, currentPin: curPin || undefined }) }).then(jsonOk),
    onSuccess: () => { setNewPin(''); setCurPin(''); toast.success('PIN zapisany') },
    onError: (e: any) => toast.error(e.message),
  })
  const removePin = useMutation({
    mutationFn: () => fetch('/api/auth/pin', { method: 'DELETE' }).then(jsonOk),
    onSuccess: () => toast.success('PIN usunięty'),
    onError: (e: any) => toast.error(e.message),
  })
  const currentTrusted = Array.isArray(devices) && devices.some((d: any) => d.current)

  if (isLoading) return <PageLoader />
  const enabled = !!status?.enabled
  const enforced = !!status?.enforced
  const copy = (t: string) => { navigator.clipboard?.writeText(t); toast.success('Skopiowano') }

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Bezpieczeństwo</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Uwierzytelnianie dwuskładnikowe (2FA)</p>
      </div>

      <div className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-3">
          {enabled
            ? <ShieldCheck className="text-green-400" size={22} />
            : <ShieldAlert className="text-yellow-400" size={22} />}
          <div>
            <div className="text-sm font-semibold text-[#E8ECF0]">
              2FA jest {enabled ? 'włączone' : 'wyłączone'}
            </div>
            <div className="text-xs text-[#6B7A8D]">
              {enabled
                ? `Pozostałe kody odzyskiwania: ${status?.recoveryCodesLeft ?? 0}`
                : enforced
                  ? 'Twoja rola wymaga włączenia 2FA przez właściciela.'
                  : 'Zalecane dla ochrony konta.'}
            </div>
          </div>
        </div>

        {/* Recovery codes (po włączeniu) */}
        {recovery && (
          <div className="rounded-lg p-4 mb-3" style={{ background: 'rgba(232,185,35,0.08)', border: '1px solid rgba(232,185,35,0.3)' }}>
            <div className="flex items-center gap-2 text-xs font-semibold text-yellow-400 mb-2"><KeyRound size={14} /> Kody odzyskiwania — zapisz je teraz</div>
            <p className="text-[11px] text-[#9AAAB8] mb-3">Każdy kod działa jednorazowo, gdy nie masz dostępu do aplikacji. Nie pokażemy ich ponownie.</p>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm text-[#E8ECF0]">
              {recovery.map((c) => <div key={c} className="px-2 py-1 rounded bg-black/20 text-center">{c}</div>)}
            </div>
            <button className="btn btn-ghost mt-3 text-xs" onClick={() => copy(recovery.join('\n'))}><Copy size={13} /> Kopiuj wszystkie</button>
          </div>
        )}

        {/* Stan: wyłączone i brak rozpoczętej konfiguracji */}
        {!enabled && !setup && (
          <button className="btn btn-gold" disabled={startSetup.isPending} onClick={() => startSetup.mutate()}>
            {startSetup.isPending ? 'Generowanie…' : 'Włącz 2FA'}
          </button>
        )}

        {/* Stan: konfiguracja w toku */}
        {!enabled && setup && (
          <div className="space-y-3">
            <div className="text-xs text-[#9AAAB8]">
              1. Dodaj konto w aplikacji uwierzytelniającej (Google Authenticator, Authy, 1Password). Wpisz klucz ręcznie:
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-lg bg-black/30 text-sm font-mono text-yellow-400 break-all">{setup.secret}</code>
              <button className="btn btn-ghost text-xs" onClick={() => copy(setup.secret)}><Copy size={13} /></button>
            </div>
            <div className="text-[11px] text-[#6B7A8D] break-all">lub link konfiguracyjny: {setup.otpauth}</div>
            <div className="text-xs text-[#9AAAB8] pt-1">2. Wpisz 6-cyfrowy kod z aplikacji, aby potwierdzić:</div>
            <div className="flex items-center gap-2">
              <input className="input tracking-[0.4em] text-center max-w-[160px]" inputMode="numeric" placeholder="000000"
                value={token} onChange={(e) => setToken(e.target.value)} />
              <button className="btn btn-gold" disabled={enable.isPending || token.length < 6} onClick={() => enable.mutate()}>
                {enable.isPending ? 'Sprawdzanie…' : 'Potwierdź i włącz'}
              </button>
            </div>
          </div>
        )}

        {/* Stan: włączone → możliwość wyłączenia (jeśli nie wymuszone) */}
        {enabled && !enforced && (
          <div className="space-y-3 pt-2 border-t border-white/5 mt-2">
            <div className="text-xs text-[#9AAAB8]">Aby wyłączyć 2FA, podaj hasło i aktualny kod (lub kod odzyskiwania):</div>
            <input className="input" type="password" placeholder="Hasło" value={disablePass} onChange={(e) => setDisablePass(e.target.value)} />
            <input className="input tracking-[0.3em]" inputMode="numeric" placeholder="Kod 2FA lub odzyskiwania" value={disableToken} onChange={(e) => setDisableToken(e.target.value)} />
            <button className="btn btn-ghost text-red-400" disabled={disable.isPending || !disablePass || !disableToken} onClick={() => disable.mutate()}>
              {disable.isPending ? 'Wyłączanie…' : 'Wyłącz 2FA'}
            </button>
          </div>
        )}
        {enabled && enforced && (
          <div className="text-xs text-[#6B7A8D] pt-2 border-t border-white/5 mt-2">
            2FA jest wymagane dla Twojej roli przez właściciela — nie można go wyłączyć.
          </div>
        )}
      </div>

      {/* Szybkie logowanie: zaufanie urządzenia + PIN */}
      <div className="card p-5 mb-4">
        <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-1">Szybkie logowanie</div>
        <p className="text-xs text-[#6B7A8D] mb-3">
          Zaufaj temu urządzeniu, aby następnym razem logować się błyskawicznie PIN-em (biometria — wkrótce).
          Sekret urządzenia jest bezpieczny i odwoływalny w każdej chwili.
        </p>
        {currentTrusted ? (
          <div className="flex items-center gap-2 text-xs text-green-400 mb-3"><ShieldCheck size={14} /> To urządzenie jest zaufane.</div>
        ) : (
          <div className="flex flex-wrap gap-2 mb-3">
            <button className="btn btn-gold" disabled={trustDevice.isPending} onClick={() => trustDevice.mutate(false)}>
              {trustDevice.isPending ? 'Ustawianie…' : 'Zaufaj temu urządzeniu'}
            </button>
            <button className="btn btn-ghost" disabled={trustDevice.isPending} onClick={() => trustDevice.mutate(true)}
              title="Tylko manager — wspólny terminal (np. POS w sali)">
              Ustaw jako terminal współdzielony
            </button>
          </div>
        )}
        <div className="space-y-2 pt-3 border-t border-white/5">
          <div className="text-xs text-[#9AAAB8]">PIN szybkiego logowania (4–6 cyfr):</div>
          <div className="flex flex-wrap items-center gap-2">
            <input className="input w-32 tracking-[0.3em] text-center" inputMode="numeric" placeholder="Nowy PIN" value={newPin} onChange={(e) => setNewPin(e.target.value)} />
            <input className="input w-36 tracking-[0.3em] text-center" inputMode="numeric" placeholder="Obecny (przy zmianie)" value={curPin} onChange={(e) => setCurPin(e.target.value)} />
            <button className="btn btn-gold" disabled={savePin.isPending || newPin.length < 4} onClick={() => savePin.mutate()}>
              {savePin.isPending ? 'Zapisywanie…' : 'Zapisz PIN'}
            </button>
            <button className="btn btn-ghost text-red-400" disabled={removePin.isPending} onClick={() => removePin.mutate()}>Usuń PIN</button>
          </div>
        </div>
      </div>

      {/* Zaufane urządzenia */}
      <div className="card p-5 mb-4">
        <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-2">Zaufane urządzenia</div>
        {(!Array.isArray(devices) || devices.length === 0) ? (
          <div className="text-xs text-[#6B7A8D]">Brak zaufanych urządzeń.</div>
        ) : (
          <div className="space-y-2">
            {devices.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="min-w-0">
                  <div className="text-sm text-[#E8ECF0] truncate">
                    {d.name} {d.shared && <span className="text-[10px] text-yellow-400 ml-1">współdzielone</span>}
                    {d.current && <span className="text-[10px] text-green-400 ml-1">to urządzenie</span>}
                  </div>
                  <div className="text-[11px] text-[#6B7A8D]">ostatnio: {new Date(d.lastSeenAt).toLocaleString('pl-PL')}</div>
                </div>
                <button className="btn btn-ghost text-red-400 text-xs flex-shrink-0" disabled={revokeDevice.isPending} onClick={() => revokeDevice.mutate(d.id)}>
                  Odwołaj
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
