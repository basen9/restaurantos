import { describe, it, expect } from 'vitest'
import { matchesSegment, hasContactFor } from '@/lib/campaigns'

const now = new Date('2026-06-15T12:00:00')

describe('matchesSegment', () => {
  it('tag', () => {
    expect(matchesSegment({ tags: ['VIP'] }, { tag: 'VIP' }, now)).toBe(true)
    expect(matchesSegment({ tags: ['stały'] }, { tag: 'VIP' }, now)).toBe(false)
  })
  it('minVisits', () => {
    expect(matchesSegment({ visits: 5 }, { minVisits: 3 }, now)).toBe(true)
    expect(matchesSegment({ visits: 2 }, { minVisits: 3 }, now)).toBe(false)
  })
  it('birthdayMonth', () => {
    expect(matchesSegment({ birthday: new Date('1990-06-20') }, { birthdayMonth: true }, now)).toBe(true)
    expect(matchesSegment({ birthday: new Date('1990-07-20') }, { birthdayMonth: true }, now)).toBe(false)
    expect(matchesSegment({ birthday: null }, { birthdayMonth: true }, now)).toBe(false)
  })
  it('pusty segment = wszyscy', () => {
    expect(matchesSegment({ visits: 0 }, {}, now)).toBe(true)
  })
})

describe('hasContactFor', () => {
  it('EMAIL wymaga email, SMS wymaga phone, PUSH zawsze', () => {
    expect(hasContactFor({ email: 'a@b.pl' }, 'EMAIL')).toBe(true)
    expect(hasContactFor({ email: null }, 'EMAIL')).toBe(false)
    expect(hasContactFor({ phone: '600' }, 'SMS')).toBe(true)
    expect(hasContactFor({ phone: null }, 'SMS')).toBe(false)
    expect(hasContactFor({}, 'PUSH')).toBe(true)
  })
})
