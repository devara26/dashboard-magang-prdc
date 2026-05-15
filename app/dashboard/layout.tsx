'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return router.push('/login')

        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (!data || data.role !== 'mahasiswa') return router.push('/login')

        setProfile(data)
      } catch (err) {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    checkUser()
  }, [router])

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg-app)]">
      <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
    </div>
  )

  const menuItems = [
    { name: 'Dashboard', icon: 'grid_view', href: '/dashboard' },
    { name: 'Presence', icon: 'schedule', href: '/dashboard/absensi' },
    { name: 'Mentor', icon: 'person_search', href: '/dashboard/pembimbing' },
    { name: 'Journal', icon: 'auto_stories', href: '/dashboard/kegiatan' },
    { name: 'Documents', icon: 'folder_open', href: '/dashboard/berkas' },
    { name: 'Profile', icon: 'person_outline', href: '/dashboard/profil' },
  ]

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)] text-[var(--text-main)]">
      {/* Sidebar - SaaS Slim Style */}
      <aside className="hidden lg:flex flex-col w-[280px] h-screen sticky top-0 bg-white border-r border-[var(--border)] px-6 py-8">
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="w-9 h-9 bg-[var(--accent)] rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
             <span className="material-symbols-outlined fill-icon text-[20px]">bolt</span>
          </div>
          <span className="text-[20px] font-black tracking-tighter">Boltshift</span>
        </div>

        <div className="flex-1 space-y-8">
          <div>
            <p className="text-[10px] font-bold text-[var(--text-light)] uppercase tracking-[2px] mb-4 px-2">Main Menu</p>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] transition-all duration-200 group ${
                      isActive 
                        ? 'bg-[var(--text-main)] text-white shadow-md' 
                        : 'text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[20px] ${isActive ? 'fill-icon' : 'group-hover:text-[var(--accent)]'}`}>
                      {item.icon}
                    </span>
                    <span className="text-[14px] font-semibold">{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        <div className="mt-auto space-y-4">
           <Link href="/dashboard/profil" className="flex items-center gap-3 p-3 bg-[var(--bg-app)] rounded-2xl border border-[var(--border)] hover:border-[var(--accent)] transition-all group">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-[var(--border)]">
                 {profile?.avatar_url ? (
                   <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center font-bold text-[var(--accent)]">
                     {profile?.nama_lengkap?.charAt(0)}
                   </div>
                 )}
              </div>
              <div className="min-w-0">
                 <p className="text-[13px] font-bold text-[var(--text-main)] truncate">{profile?.nama_lengkap?.split(' ')[0]}</p>
                 <p className="text-[11px] text-[var(--text-muted)] truncate">{profile?.nim || 'Student'}</p>
              </div>
           </Link>
           
           <button 
             onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
             className="flex w-full items-center gap-3 px-4 py-3 text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-red-50 rounded-[var(--radius-md)] transition-all text-sm font-semibold"
           >
             <span className="material-symbols-outlined text-[20px]">logout</span>
             Logout
           </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-[72px] bg-white/80 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-30 px-6 lg:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[var(--bg-app)]">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-[14px] font-medium">
              <span>Orbit</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="text-[var(--text-main)] font-bold">{pathname.split('/').pop() || 'Dashboard'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center gap-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-xl px-4 py-2 w-64 group focus-within:border-[var(--accent)] transition-all">
                <span className="material-symbols-outlined text-[18px] text-[var(--text-light)]">search</span>
                <input placeholder="Search..." className="bg-transparent border-none outline-none text-xs font-medium w-full" />
                <span className="text-[10px] text-[var(--text-light)] font-bold">⌘K</span>
             </div>
             
             <button className="w-10 h-10 flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-app)] rounded-xl relative">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-3 right-3 w-2 h-2 bg-[var(--error)] rounded-full border-2 border-white"></span>
             </button>
             
             <button className="lg:hidden w-9 h-9 rounded-full overflow-hidden bg-[var(--accent)] text-white font-bold text-xs">
                {profile?.nama_lengkap?.charAt(0)}
             </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 scroll-smooth">
          <div className="max-w-[1440px] mx-auto animate-slide-up">
            {children}
          </div>
        </div>

        {/* Mobile Nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] h-16 flex justify-around items-center z-50">
           {menuItems.slice(0, 4).map((item) => (
             <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-0.5 ${pathname === item.href ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                <span className={`material-symbols-outlined text-[22px] ${pathname === item.href ? 'fill-icon' : ''}`}>{item.icon}</span>
                <span className="text-[9px] font-bold uppercase tracking-tight">{item.name}</span>
             </Link>
           ))}
        </nav>
      </main>
    </div>
  )
}
