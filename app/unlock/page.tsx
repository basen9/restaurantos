import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCurrentDevice } from '@/lib/deviceServer'
import { UnlockPad } from '@/components/launcher/UnlockPad'

export const dynamic = 'force-dynamic'

// Szybkie odblokowanie PIN-em na zaufanym urządzeniu (bez hasła).
export default async function UnlockPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/launcher')
  const device = await getCurrentDevice()
  // Brak ważnego urządzenia lub brak ustawionego PIN → pełne logowanie.
  if (!device || !device.hasPin) redirect('/login')
  return <UnlockPad shared={device.shared} userName={device.userName} />
}
