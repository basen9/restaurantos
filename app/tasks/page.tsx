'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { getPriorityColor, getStatusColor, priorityLabel, statusLabel } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, Play, Check, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'

export default function TasksPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'ALL'|'TODO'|'IN_PROGRESS'|'DONE'>('ALL')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', dueTime: '', assigneeId: '' })

  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['tasks'], queryFn: () => fetch('/api/tasks').then(r => r.json()) })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => fetch('/api/users').then(r => r.json()), enabled: role !== 'EMPLOYEE' })

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Zadanie zaktualizowane') }
  })

  const deleteTask = useMutation({
    mutationFn: (id: string) => fetch(`/api/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Zadanie usunięte') }
  })

  const createTask = useMutation({
    mutationFn: (data: any) => fetch('/api/tasks', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Zadanie dodane'); setShowAdd(false); setForm({ title:'', description:'', priority:'MEDIUM', dueTime:'', assigneeId:'' }) }
  })

  const filtered = Array.isArray(tasks) ? tasks.filter((t: any) => filter === 'ALL' || t.status === filter) : []
  const counts = Array.isArray(tasks) ? { ALL: tasks.length, TODO: tasks.filter((t:any)=>t.status==='TODO').length, IN_PROGRESS: tasks.filter((t:any)=>t.status==='IN_PROGRESS').length, DONE: tasks.filter((t:any)=>t.status==='DONE').length } : { ALL:0, TODO:0, IN_PROGRESS:0, DONE:0 }

  if (isLoading) return <PageLoader />

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-[#F5F0E8]">Zadania</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">Przydzielone i zarządzane</p>
        </div>
        {role !== 'EMPLOYEE' && (
          <button className="btn btn-gold" onClick={() => setShowAdd(true)}><Plus size={14}/> Nowe zadanie</button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{background:'#21253A'}}>
        {(['ALL','TODO','IN_PROGRESS','DONE'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn('flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all',
              filter === s ? 'bg-[#1A1D27] text-yellow-400' : 'text-[#6B7A8D] hover:text-[#E8ECF0]')}>
            {s === 'ALL' ? 'Wszystkie' : s === 'TODO' ? 'Do zrobienia' : s === 'IN_PROGRESS' ? 'W trakcie' : 'Wykonane'}
            <span className="ml-1.5 text-[10px] opacity-60">({counts[s]})</span>
          </button>
        ))}
      </div>

      {/* Tasks list */}
      {filtered.length === 0 ? (
        <EmptyState icon="✅" text="Brak zadań w tej kategorii" />
      ) : (
        <div className="space-y-2">
          {filtered.map((task: any) => (
            <div key={task.id} className={cn('card p-4 flex items-start gap-3 transition-all', task.status === 'DONE' && 'opacity-50')}>
              <div className={cn('w-1 self-stretch rounded-full flex-shrink-0', task.priority === 'HIGH' || task.priority === 'URGENT' ? 'bg-red-400' : task.priority === 'MEDIUM' ? 'bg-orange-400' : 'bg-green-400')} />
              <div className="flex-1 min-w-0">
                <div className={cn('font-medium text-sm text-[#E8ECF0]', task.status === 'DONE' && 'line-through')}>{task.title}</div>
                {task.description && <div className="text-xs text-[#6B7A8D] mt-0.5">{task.description}</div>}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <Badge variant={task.priority === 'HIGH' || task.priority === 'URGENT' ? 'red' : task.priority === 'MEDIUM' ? 'orange' : 'green'}>{priorityLabel(task.priority)}</Badge>
                  {task.dueTime && <span className="text-xs text-[#6B7A8D]">Do {task.dueTime}</span>}
                  {task.assignee && <span className="text-xs text-[#6B7A8D]">→ {task.assignee.name}</span>}
                  {task.creator && <span className="text-xs text-[#6B7A8D]">od: {task.creator.name}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {task.status === 'TODO' && (
                  <button className="btn btn-ghost py-1.5 px-2.5 text-xs" onClick={() => updateTask.mutate({ id: task.id, data: { status: 'IN_PROGRESS' } })}><Play size={12}/> Start</button>
                )}
                {task.status === 'IN_PROGRESS' && (
                  <button className="btn btn-success py-1.5 px-2.5 text-xs" onClick={() => updateTask.mutate({ id: task.id, data: { status: 'DONE' } })}><Check size={12}/> Gotowe</button>
                )}
                {role !== 'EMPLOYEE' && (
                  <button className="btn btn-danger py-1.5 px-2 text-xs" onClick={() => deleteTask.mutate(task.id)}><Trash2 size={12}/></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add task modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nowe zadanie">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Tytuł *</label>
            <input className="input" placeholder="Nazwa zadania..." value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} /></div>
          <div><label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Opis</label>
            <textarea className="input" rows={2} placeholder="Szczegóły..." value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Priorytet</label>
              <select className="input" value={form.priority} onChange={e => setForm(p => ({...p, priority: e.target.value}))}>
                <option value="LOW">Niski</option><option value="MEDIUM">Średni</option><option value="HIGH">Wysoki</option><option value="URGENT">Pilny</option>
              </select></div>
            <div><label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Do godz.</label>
              <input type="time" className="input" value={form.dueTime} onChange={e => setForm(p => ({...p, dueTime: e.target.value}))} /></div>
          </div>
          <div><label className="block text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider mb-1.5">Przydziel do *</label>
            <select className="input" value={form.assigneeId} onChange={e => setForm(p => ({...p, assigneeId: e.target.value}))}>
              <option value="">Wybierz pracownika...</option>
              {Array.isArray(users) && users.filter((u:any) => u.role === 'EMPLOYEE').map((u:any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select></div>
          <div className="flex gap-3 pt-2">
            <button className="btn btn-ghost flex-1" onClick={() => setShowAdd(false)}>Anuluj</button>
            <button className="btn btn-gold flex-1" onClick={() => createTask.mutate(form)} disabled={!form.title || !form.assigneeId}>Dodaj zadanie</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
