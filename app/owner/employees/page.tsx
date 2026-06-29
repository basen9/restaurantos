'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { getInitials, cn } from '@/lib/utils'
import { ShieldCheck } from 'lucide-react'

const PERM_OPTIONS = [
  { key: 'users.view', label: 'Podgląd pracowników' },
  { key: 'users.manage', label: 'Zarządzanie pracownikami' },
  { key: 'schedule.manage', label: 'Zarządzanie grafikiem' },
  { key: 'shifts.view_all', label: 'Podgląd wszystkich zmian' },
  { key: 'vacations.approve', label: 'Zatwierdzanie urlopów' },
  { key: 'tasks.manage', label: 'Zarządzanie zadaniami' },
  { key: 'analytics.view', label: 'Analityka / AI COO' },
  { key: 'finance.view', label: 'Finanse / POS' },
  { key: 'inventory.manage', label: 'Magazyn / faktury' },
  { key: 'products.manage', label: 'Receptury / produkty' },
  { key: 'incidents.manage', label: 'Awarie' },
  { key: 'waste.view_all', label: 'Wszystkie straty' },
  { key: 'org.manage', label: 'Ustawienia organizacji' },
]
const SHIFT_MANAGER = ['users.view', 'schedule.manage', 'shifts.view_all', 'vacations.approve', 'tasks.manage', 'incidents.manage', 'waste.view_all']

export default function OwnerEmployeesPage() {
  const qc = useQueryClient()
  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: () => fetch('/api/users').then(r => r.json()) })
  const [edit, setEdit] = useState<any>(null)
  const [perms, setPerms] = useState<string[]>([])

  useEffect(() => { if (edit) setPerms(edit.permissions || []) }, [edit])

  const save = useMutation({
    mutationFn: ({ id, permissions }: any) => fetch(`/api/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ permissions }) }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => { toast.success('Uprawnienia zaktualizowane'); setEdit(null); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: (e: any) => toast.error(e.message || 'Błąd'),
  })

  if (isLoading) return <PageLoader />
  const list = Array.isArray(users) ? users : []
  const toggle = (k: string) => setPerms(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k])

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Pracownicy</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Zespół i uprawnienia ({list.length})</p>
      </div>
      {list.length === 0 ? <EmptyState icon="👥" text="Brak pracowników" /> : (
        <div className="space-y-2">
          {list.map((u: any) => (
            <div key={u.id} className="card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[#0F1117] flex-shrink-0" style={{ background: 'linear-gradient(135deg,#E8B923,#C49A1A)' }}>{getInitials(u.name)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#E8ECF0]">{u.name}</div>
                <div className="text-xs text-[#6B7A8D]">{u.position || '—'}{u.role === 'EMPLOYEE' && u.permissions?.length ? ` · ${u.permissions.length} uprawnień` : ''}</div>
              </div>
              <Badge variant={u.role === 'OWNER' ? 'gold' : 'gray'}>{u.role === 'OWNER' ? 'Właściciel' : 'Pracownik'}</Badge>
              {u.role === 'EMPLOYEE' && <button className="btn btn-ghost py-1.5 px-2.5 text-xs" onClick={() => setEdit(u)}><ShieldCheck size={13} /> Uprawnienia</button>}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Uprawnienia: ${edit?.name || ''}`} size="lg">
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button className="btn btn-ghost text-xs py-1.5" onClick={() => setPerms(SHIFT_MANAGER)}>Pakiet: Kierownik zmiany</button>
            <button className="btn btn-ghost text-xs py-1.5" onClick={() => setPerms([])}>Wyczyść</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[50vh] overflow-y-auto">
            {PERM_OPTIONS.map(o => (
              <button key={o.key} onClick={() => toggle(o.key)} className={cn('flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-all', perms.includes(o.key) ? 'text-[#E8ECF0]' : 'text-[#9AAAB8] hover:bg-white/5')} style={{ background: perms.includes(o.key) ? 'rgba(232,185,35,0.1)' : 'transparent' }}>
                <div className={cn('w-4 h-4 rounded border flex items-center justify-center flex-shrink-0', perms.includes(o.key) ? 'bg-yellow-400 border-yellow-400' : 'border-white/20')}>{perms.includes(o.key) && <span className="text-[#0F1117] text-[10px]">✓</span>}</div>
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#9AAAB8] flex items-start gap-1.5"><span>ℹ️</span> Zmiany uprawnień zaczną działać po ponownym zalogowaniu pracownika (sesja jest ważna do 8 godz.).</p>
          <button className="btn btn-gold w-full" disabled={save.isPending} onClick={() => save.mutate({ id: edit.id, permissions: perms })}>Zapisz uprawnienia</button>
        </div>
      </Modal>
    </div>
  )
}
