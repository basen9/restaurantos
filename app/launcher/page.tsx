import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { modulesForUser } from '@/lib/modules'
import { getCurrentDevice } from '@/lib/deviceServer'
import { Launcher } from '@/components/launcher/Launcher'

export const dynamic = 'force-dynamic'

// Ekran wyboru modułu jednej platformy RestaurantOS.
export default async function LauncherPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/')
  const user = session.user as any
  const modules = modulesForUser({ role: user.role, permissions: user.permissions })
  const device = await getCurrentDevice()
  return (
    <Launcher
      userName={user.name || 'Użytkownik'}
      modules={modules}
      deviceTrusted={!!device}
    />
  )
}
