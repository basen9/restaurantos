import { describe, it, expect } from 'vitest'
import { mergeSettings, DEFAULT_SETTINGS } from '@/lib/settings'

describe('mergeSettings', () => {
  it('zwraca domyślne dla pustego wejścia', () => {
    expect(mergeSettings({})).toEqual(DEFAULT_SETTINGS)
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
  })
  it('nadpisuje tylko podane pola', () => {
    const m = mergeSettings({ tipModel: 'pooled', defaultVatRate: 23 })
    expect(m.tipModel).toBe('pooled')
    expect(m.defaultVatRate).toBe(23)
    expect(m.currency).toBe('PLN') // reszta domyślna
    expect(m.voidRequiresManager).toBe(true)
  })
  it('ignoruje nie-obiektowe wejście', () => {
    expect(mergeSettings('garbage')).toEqual(DEFAULT_SETTINGS)
  })
})
