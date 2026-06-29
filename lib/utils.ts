import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatDateShort(date: Date | string) {
  return new Date(date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

export function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function getPriorityColor(priority: string) {
  const map: Record<string, string> = {
    LOW: 'text-green-400 bg-green-400/10 border-green-400/20',
    MEDIUM: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    HIGH: 'text-red-400 bg-red-400/10 border-red-400/20',
    URGENT: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  }
  return map[priority] || map.MEDIUM
}

export function getStatusColor(status: string) {
  const map: Record<string, string> = {
    TODO: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    IN_PROGRESS: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    DONE: 'text-green-400 bg-green-400/10 border-green-400/20',
    PENDING: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    APPROVED: 'text-green-400 bg-green-400/10 border-green-400/20',
    REJECTED: 'text-red-400 bg-red-400/10 border-red-400/20',
    OPEN: 'text-red-400 bg-red-400/10 border-red-400/20',
    RESOLVED: 'text-green-400 bg-green-400/10 border-green-400/20',
    SCHEDULED: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    COMPLETED: 'text-green-400 bg-green-400/10 border-green-400/20',
    ACTIVE: 'text-gold bg-gold/10 border-gold/20',
  }
  return map[status] || 'text-gray-400 bg-gray-400/10 border-gray-400/20'
}

export function priorityLabel(p: string) {
  const m: Record<string, string> = { LOW: 'Niski', MEDIUM: 'Średni', HIGH: 'Wysoki', URGENT: 'Pilny' }
  return m[p] || p
}

export function statusLabel(s: string) {
  const m: Record<string, string> = {
    TODO: 'Do zrobienia', IN_PROGRESS: 'W trakcie', DONE: 'Wykonane',
    PENDING: 'Oczekujący', APPROVED: 'Zaakceptowany', REJECTED: 'Odrzucony',
    OPEN: 'Otwarte', IN_PROGRESS_INC: 'W trakcie naprawy', RESOLVED: 'Naprawione',
    SCHEDULED: 'Zaplanowana', COMPLETED: 'Zakończona', ACTIVE: 'Aktywna',
    ABSENT: 'Nieobecność', LATE: 'Spóźnienie', CANCELLED: 'Anulowane',
    ANNUAL: 'Urlop wypoczynkowy', ON_DEMAND: 'Urlop na żądanie',
    UNPAID: 'Urlop bezpłatny', SICK: 'Zwolnienie lekarskie', OTHER: 'Inne',
  }
  return m[s] || s
}
