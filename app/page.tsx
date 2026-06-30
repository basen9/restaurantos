import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCurrentDevice } from '@/lib/deviceServer'

// Korzeń platformy:
//  • aktywna sesja → launcher modułów,
//  • brak sesji, ale zaufane urządzenie z PIN → szybkie odblokowanie,
//  • w innym wypadku → pełne logowanie.
export default async function Home() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/launcher')
  const device = await getCurrentDevice()
  if (device && device.hasPin) redirect('/unlock')
  redirect('/login')
}
