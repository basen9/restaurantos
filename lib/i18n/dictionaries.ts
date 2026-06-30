// Słowniki tłumaczeń. Dodanie języka = nowy klucz w `dictionaries` z tym samym zestawem kluczy.
// Klucze grupowane kropką (np. "nav.dashboard"). Brak klucza → fallback do języka domyślnego, potem do klucza.

export const LANGUAGES = [
  { code: 'pl', label: 'Polski' },
  { code: 'en', label: 'English' },
] as const

export type Lang = (typeof LANGUAGES)[number]['code']
export const DEFAULT_LANG: Lang = 'pl'

type Dict = Record<string, string>

const pl: Dict = {
  'common.save': 'Zapisz',
  'common.cancel': 'Anuluj',
  'common.add': 'Dodaj',
  'common.edit': 'Edytuj',
  'common.delete': 'Usuń',
  'common.search': 'Szukaj',
  'common.language': 'Język',
  'common.logout': 'Wyloguj',
  'nav.dashboard': 'Dashboard',
  'nav.floor': 'Plan sali',
  'nav.kds': 'Ekran kuchni',
  'nav.menu': 'Menu',
  'nav.reservations': 'Rezerwacje',
  'nav.cash': 'Kasa',
  'nav.warehouse': 'Magazyn',
  'nav.invoices': 'Faktury',
  'nav.recipes': 'Receptury',
  'nav.guests': 'Goście (CRM)',
  'nav.campaigns': 'Kampanie',
  'nav.payroll': 'Płace',
  'nav.analytics': 'Analityka',
  'nav.reports': 'Raporty sprzedaży',
  'nav.settings': 'Ustawienia',
  'nav.schedule': 'Grafik',
  'nav.tasks': 'Zadania',
  'nav.coo': 'AI COO',
  'nav.alerts': 'Alerty',
  'nav.employees': 'Pracownicy',
  'nav.audit': 'Dziennik audytu',
}

const en: Dict = {
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.add': 'Add',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.search': 'Search',
  'common.language': 'Language',
  'common.logout': 'Log out',
  'nav.dashboard': 'Dashboard',
  'nav.floor': 'Floor plan',
  'nav.kds': 'Kitchen display',
  'nav.menu': 'Menu',
  'nav.reservations': 'Reservations',
  'nav.cash': 'Cash drawer',
  'nav.warehouse': 'Inventory',
  'nav.invoices': 'Invoices',
  'nav.recipes': 'Recipes',
  'nav.guests': 'Guests (CRM)',
  'nav.campaigns': 'Campaigns',
  'nav.payroll': 'Payroll',
  'nav.analytics': 'Analytics',
  'nav.reports': 'Sales reports',
  'nav.settings': 'Settings',
  'nav.schedule': 'Schedule',
  'nav.tasks': 'Tasks',
  'nav.coo': 'AI COO',
  'nav.alerts': 'Alerts',
  'nav.employees': 'Employees',
  'nav.audit': 'Audit log',
}

export const dictionaries: Record<Lang, Dict> = { pl, en }

// Tłumaczenie klucza w danym języku (z fallbackiem do PL, potem do samego klucza).
export function translate(lang: Lang, key: string): string {
  return dictionaries[lang]?.[key] ?? dictionaries[DEFAULT_LANG]?.[key] ?? key
}
