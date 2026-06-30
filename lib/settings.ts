// Konfiguracja organizacji — wszystkie decyzje projektowe są zmienialne z ustawień.
// Wzorowane na Toast/Square/Lightspeed/MICROS, ale z domyślnymi wartościami sensownymi dla PL.

export interface OrgSettings {
  currency: string // waluta (wyświetlanie)
  defaultVatRate: number // domyślna stawka VAT nowych pozycji menu
  serviceChargePct: number // (legacy) automatyczna opłata serwisowa (% — 0 = wyłączona)
  serviceChargeEnabled: boolean // opłata serwisowa włączona
  serviceChargeType: 'PERCENT' | 'AMOUNT' // typ opłaty
  serviceChargeValue: number // wartość (procent lub kwota)
  serviceChargeVatRate: number // stawka VAT opłaty serwisowej
  waiterDiscountLimitPct: number // maks. % rabatu dla kelnera (bez uprawnienia managera)
  twoFactorRequiredRoles: string[] // role z wymuszonym 2FA (np. ['OWNER'])
  tipModel: 'individual' | 'pooled' // model napiwków: indywidualny / wspólna pula
  voidRequiresManager: boolean // czy storno wymaga uprawnienia managera
  cashTipsInDrawer: boolean // czy napiwki gotówkowe wliczać do oczekiwanej gotówki
  loyaltyEnabled: boolean // program lojalnościowy
  loyaltyPointsPerCurrency: number // ile punktów za 1 jednostkę waluty wydaną
  loyaltyRedeemValue: number // wartość 1 punktu przy wymianie (w walucie)
  slowServiceMinutes: number // próg alertu "wolna obsługa" (min)
  reservationsEnabled: boolean // moduł rezerwacji
}

export const DEFAULT_SETTINGS: OrgSettings = {
  currency: 'PLN',
  defaultVatRate: 8,
  serviceChargePct: 0,
  serviceChargeEnabled: false,
  serviceChargeType: 'PERCENT',
  serviceChargeValue: 0,
  serviceChargeVatRate: 8,
  waiterDiscountLimitPct: 0,
  twoFactorRequiredRoles: [],
  tipModel: 'individual',
  voidRequiresManager: true,
  cashTipsInDrawer: true,
  loyaltyEnabled: false,
  loyaltyPointsPerCurrency: 1,
  loyaltyRedeemValue: 0.05,
  slowServiceMinutes: 20,
  reservationsEnabled: true,
}

// Scala zapisane ustawienia z domyślnymi (twardo typowane).
export function mergeSettings(raw: unknown): OrgSettings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<OrgSettings>
  return { ...DEFAULT_SETTINGS, ...s }
}
