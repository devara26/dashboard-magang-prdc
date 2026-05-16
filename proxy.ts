import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/dosen')
  const isAuth = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register'

  // Gunakan clone() agar lebih stabil di Edge Runtime
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    if (isProtected || isAuth) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profile?.role || 'mahasiswa'

      if (isAuth) {
        const url = request.nextUrl.clone()
        url.pathname = role === 'dosen' ? '/dosen' : '/dashboard'
        return NextResponse.redirect(url)
      }

      if (request.nextUrl.pathname.startsWith('/dashboard') && role === 'dosen') {
        const url = request.nextUrl.clone()
        url.pathname = '/dosen'
        return NextResponse.redirect(url)
      }

      if (request.nextUrl.pathname.startsWith('/dosen') && role === 'mahasiswa') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  // Redirect root to dashboard (or dosen)
  if (request.nextUrl.pathname === '/') {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      const role = profile?.role || 'mahasiswa'
      const url = request.nextUrl.clone()
      url.pathname = role === 'dosen' ? '/dosen' : '/dashboard'
      return NextResponse.redirect(url)
    } else {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Mengecualikan rute internal Next.js dan file statis 
     * agar proxy tidak bekerja terlalu berat di background.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

export default proxy
export { proxy as middleware }