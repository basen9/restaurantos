// Centralna brama autoryzacji dla stron (API chroni się własną warstwą requireAuth).
// Zastępuje rozproszoną ochronę w layoutach pojedynczym punktem kontroli.
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as any
    const path = req.nextUrl.pathname

    // Strefa właściciela — tylko OWNER.
    if (path.startsWith('/owner') && token?.role !== 'OWNER') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  },
  {
    callbacks: { authorized: ({ token }) => !!token },
    pages: { signIn: '/login' },
  },
)

// Chroni wszystkie strony poza: /login, /api/*, publiczne menu /m/*, zasoby Next, pliki statyczne.
export const config = {
  matcher: ['/((?!api|login|m/|_next/static|_next/image|favicon.ico|.*\\.).*)'],
}
