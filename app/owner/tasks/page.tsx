'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import { priorityLabel, statusLabel } from '@/lib/utils'

export default function OwnerTasksPage() {
  const qc = useQueryClient()
  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['tasks'], queryFn: () => fetch('/api/tasks').then(r => r.json()) })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => fetch('/api/users').then(r => r.json()) })
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', priority: 'MEDIUM', dueTime: '', assigneeId: '' })

  const create = useMutation({
    mutationFn: (d: any) => fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => { toast.success('Zadanie dodane'); setShowAdd(false); setForm({ title: '', priority: 'MEDIUM', dueTime: '', assigneeId: '' }); qc.invalidateQueries({ queryKey: ['tasks'] }) },
    onError: () => toast.error('Błąd'),
  })
  const del = useMutation({
    mutationFn: (id: string) => fetch(`/api/tasks/${id}`, { method: 'DELETE' }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => { toast.success('Usunięto'); qc.invalidateQueries({ queryKey: ['tasks'] }) },
    onError: () => toast.error('Błąd'),
  })

  if (isLoading) return <PageLoader />
  const list = Array.isArray(tasks) ? tasks : []
  const employees = Array.isArray(users) ? users.filter((u: any) => u.role === 'EMPLOYEE') : []

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-[#F5F0E8]">Zadania</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">Zarządzanie zadaniami zespołu</p>
        </div>
        <button className="btn btn-gold" onClick={() => setShowAdd(true)}><Plus size={14} /> Nowe zadanie</button>
      </div>
      {list.length === 0 ? <EmptyState icon="✅" text="Brak zadań" /> : (
        <div className="space-y-2">
          {list.map((t: any) => (
            <div key={t.id} className="card p-4 flex items-center gap-3">
              <div className={`w-1 self-stretch rounded-full ${t.priority === 'HIGH' || t.priority === 'URGENT' ? 'bg-red-400' : t.priority === 'MEDIUM' ? 'bg-orange-400' : 'bg-green-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#E8ECF0]">{t.title}</div>
                <div className="text-xs text-[#6B7A8D]">{t.assignee?.name ? `→ ${t.assignee.name}` : ''} {t.dueTime ? `· do ${t.dueTime}` : ''}</div>
              </div>
              <Badge variant={t.status === 'DONE' ? 'green' : t.status === 'IN_PROGRESS' ? 'blue' : 'orange'}>{statusLabel(t.status)}</Badge>
              <button className="btn btn-danger py-1.5 px-2 text-xs" onClick={() => del.mutate(t.id)}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nowe zadanie">
        <div className="space-y-3">
          <input className="input" placeholder="Tytuł zadania" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <select className="input" value={form.assigneeId} onChange={e => setForm(p => ({ ...p, assigneeId: e.target.value }))}>
              <option value="">Przypisz do…</option>
              {employees.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select className="input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
              <option value="LOW">{priorityLabel('LOW')}</option><option value="MEDIUM">{priorityLabel('MEDIUM')}</option><option value="HIGH">{priorityLabel('HIGH')}</option><option value="URGENT">{priorityLabel('URGENT')}</option>
            </select>
          </div>
          <input type="time" className="input" value={form.dueTime} onChange={e => setForm(p => ({ ...p, dueTime: e.target.value }))} />
          <button className="btn btn-gold w-full" disabled={!form.title || !form.assigneeId || create.isPending} onClick={() => create.mutate(form)}>Dodaj zadanie</button>
        </div>
      </Modal>
    </div>
  )
}
