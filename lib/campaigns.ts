// Logika segmentów i abstrakcja dostawcy kampanii — testowalna, gotowa pod integracje.

export interface Segment {
  tag?: string
  birthdayMonth?: boolean
  minVisits?: number
}

export interface GuestLike {
  email?: string | null
  phone?: string | null
  tags?: string[]
  visits?: number
  birthday?: Date | string | null
}

// Czy gość pasuje do segmentu. Pure → testowalne.
export function matchesSegment(guest: GuestLike, segment: Segment, now = new Date()): boolean {
  if (segment.tag && !(guest.tags || []).includes(segment.tag)) return false
  if (segment.minVisits && (guest.visits || 0) < segment.minVisits) return false
  if (segment.birthdayMonth) {
    if (!guest.birthday) return false
    if (new Date(guest.birthday).getMonth() !== now.getMonth()) return false
  }
  return true
}

// Kanał wymaga kontaktu: EMAIL→email, SMS→phone, PUSH→(brak — kanał wewnętrzny/mock).
export function hasContactFor(guest: GuestLike, channel: 'EMAIL' | 'SMS' | 'PUSH'): boolean {
  if (channel === 'EMAIL') return !!guest.email
  if (channel === 'SMS') return !!guest.phone
  return true // PUSH: mock/wewnętrzny
}

// Abstrakcja dostawcy wysyłki. Domyślny provider = mock (nic nie wysyła, raportuje liczby).
// Realnych dostawców (SendGrid/Twilio/FCM) podłącza się tu bez zmian w logice kampanii.
export interface CampaignSender {
  name: string
  send(channel: 'EMAIL' | 'SMS' | 'PUSH', recipients: { to: string }[], payload: { subject?: string; message: string }): Promise<{ sent: number; failed: number }>
}

export const mockSender: CampaignSender = {
  name: 'mock',
  async send(_channel, recipients) {
    return { sent: recipients.length, failed: 0 }
  },
}
