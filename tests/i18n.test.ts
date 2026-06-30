import { describe, it, expect } from 'vitest'
import { translate, dictionaries, LANGUAGES, DEFAULT_LANG } from '@/lib/i18n/dictionaries'

describe('i18n translate', () => {
  it('translates a known key per language', () => {
    expect(translate('pl', 'common.save')).toBe('Zapisz')
    expect(translate('en', 'common.save')).toBe('Save')
  })

  it('falls back to default language when key missing in target', () => {
    // brak klucza w obu → zwraca sam klucz
    expect(translate('en', 'nonexistent.key')).toBe('nonexistent.key')
  })

  it('returns the raw key when not present anywhere', () => {
    expect(translate('pl', 'totally.unknown')).toBe('totally.unknown')
  })

  it('every language has the same set of keys as the default', () => {
    const base = Object.keys(dictionaries[DEFAULT_LANG]).sort()
    for (const { code } of LANGUAGES) {
      expect(Object.keys(dictionaries[code]).sort()).toEqual(base)
    }
  })
})
