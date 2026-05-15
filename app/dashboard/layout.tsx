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
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          router.push('/login')
          return
        }

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError || !data) {
          console.error('Profile Error:', profileError)
          router.push('/login')
          return
        }

        if (data.role !== 'mahasiswa') {
          router.push('/login')
          return
        }

        setProfile(data)
      } catch (err) {
        console.error('Auth Check Error:', err)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    checkUser()
  }, [router])

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[var(--background)]">
      <div className="w-12 h-12 border-4 border-[var(--surface-container-high)] border-t-[var(--primary)] rounded-full animate-spin" />
    </div>
  )

  const menuItems = [
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Presence', icon: 'calendar_today', href: '/dashboard/absensi' },
    { name: 'Mentor', icon: 'groups', href: '/dashboard/pembimbing' },
    { name: 'Journal', icon: 'menu_book', href: '/dashboard/kegiatan' },
    { name: 'Documents', icon: 'folder_open', href: '/dashboard/berkas' },
    { name: 'Profile', icon: 'person', href: '/dashboard/profil' },
  ]

  return (
    <div className="flex min-h-screen bg-[var(--background)] selection:bg-[var(--primary-container)] selection:text-[var(--on-primary-container)]">
      {/* Sidebar Navigation (Desktop) */}
      <aside className="hidden md:flex flex-col h-screen fixed left-0 top-0 w-[280px] bg-[var(--surface)] border-r border-[var(--outline-variant)] py-8 px-4 z-50">
        <div className="flex items-center gap-4 px-3 mb-12">
          <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
             <img alt="Logo" className="w-6 h-6 object-contain brightness-0 invert" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-lj9NJ-_cWVcQUmdvNr69F-tbJGVE3Q0NWDbyArku3-5TDLWEF8OixM-dkAUw-U6roZH596Rfl-_d5Dj0qoqpZzaf3-wq0iNstPmaTR0g_YFaXy-exQBwMRm398AJSyh-QfM2Zn36csPwxhaDUGWbGpG5yDF8Ax7j1RjGXKgpQxRyn2W55SieA7iKzPvz4COQcA3xIJYxaUJW4pIBOYKBf_CvyyU80x6M-kDiPKAmuDqpIVkXMjKuuE8RBzMhDHi81_b2nEHvvA"/>
          </div>
          <div>
            <h2 className="text-[18px] font-black text-[var(--on-surface)] leading-none tracking-tighter">ORBIT</h2>
            <p className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest mt-1">Magang Platform</p>
          </div>
        </div>
        
        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)] shadow-sm' 
                    : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)]'
                }`}
              >
                <span className={`material-symbols-outlined transition-all ${isActive ? 'fill-1 scale-110' : 'group-hover:text-[var(--primary)]'}`} style={{ fontVariationSettings: isActive ? "'FILL' 1" : "" }}>
                  {item.icon}
                </span>
                <span className={`text-[14px] ${isActive ? 'font-black' : 'font-semibold'}`}>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-[var(--outline-variant)] pt-6">
          <div className="bg-[var(--surface-container-low)] rounded-3xl p-4 mb-4 flex items-center gap-3 border border-[var(--outline-variant)]/30">
             <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--primary-container)] border-2 border-white shadow-sm">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-[var(--primary)]">
                    {profile?.nama_lengkap?.charAt(0)}
                  </div>
                )}
             </div>
             <div className="min-w-0">
                <p className="text-xs font-black text-[var(--on-surface)] truncate">{profile?.nama_lengkap}</p>
                <p className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase tracking-wider">{profile?.nim || 'Mahasiswa'}</p>
             </div>
          </div>
          <button 
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="flex w-full items-center gap-4 px-4 py-3.5 text-[var(--error)] hover:bg-[var(--error-container)] hover:text-[var(--on-error-container)] rounded-2xl transition-all font-bold"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-[14px]">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-[280px] flex flex-col">
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-6 md:px-12 h-20 bg-[var(--surface)]/80 backdrop-blur-xl border-b border-[var(--outline-variant)] sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-[var(--on-surface)] hover:bg-[var(--surface-container-low)] rounded-full transition-colors">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="flex flex-col">
               <span className="text-[12px] font-black text-[var(--primary)] uppercase tracking-widest leading-none mb-1">Student Portal</span>
               <span className="text-[20px] font-black text-[var(--on-surface)] tracking-tight">Pusat Informasi</span>
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            <button className="w-11 h-11 flex items-center justify-center text-[var(--on-surface-variant)] bg-[var(--surface-container-low)] hover:bg-[var(--surface-container-high)] border border-[var(--outline-variant)]/50 transition-all rounded-2xl relative group">
              <span className="material-symbols-outlined transition-transform group-hover:rotate-12">notifications</span>
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[var(--error)] rounded-full border-2 border-[var(--surface-container-low)]"></span>
            </button>
            
            <div className="h-10 w-px bg-[var(--outline-variant)] mx-1"></div>
            
            <Link href="/dashboard/profil" className="flex items-center gap-3 p-1 pr-4 rounded-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)] hover:border-[var(--primary)] transition-all group">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-[var(--surface-container-highest)] border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--primary-container)] text-[var(--on-primary-container)] font-bold text-sm">
                    {profile?.nama_lengkap?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-[11px] font-black text-[var(--on-surface)] leading-none mb-1">{profile?.nama_lengkap?.split(' ')[0]}</p>
                <p className="text-[9px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest">{profile?.role}</p>
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 md:p-12 max-w-[1440px] mx-auto w-full flex-1">
          {children}
        </div>

        {/* Bottom Navigation (Mobile) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface)]/90 backdrop-blur-xl border-t border-[var(--outline-variant)] flex justify-around items-center h-20 pb-4 px-4 z-50">
          {menuItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center gap-1.5 flex-1 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--on-surface-variant)]'}`}>
                <div className={`w-12 h-8 flex items-center justify-center rounded-full transition-all ${isActive ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]' : 'hover:bg-[var(--surface-container-low)]'}`}>
                  <span className={`material-symbols-outlined ${isActive ? 'fill-1' : ''}`} style={{ fontVariationSettings: isActive ? "'FILL' 1" : "" }}>
                    {item.icon}
                  </span>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-tighter transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </main>
    </div>
  )
}
