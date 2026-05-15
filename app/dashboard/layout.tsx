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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data?.role !== 'mahasiswa') {
        router.push('/login')
        return
      }

      setProfile(data)
      setLoading(false)
    }
    checkUser()
  }, [router])

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[var(--background)]">
      <div className="w-10 h-10 border-4 border-[var(--surface-container-high)] border-t-[var(--primary)] rounded-full animate-spin" />
    </div>
  )

  const menuItems = [
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Presence', icon: 'calendar_today', href: '/dashboard/absensi' },
    { name: 'Mentor', icon: 'groups', href: '/dashboard/mentor' },
    { name: 'Journal', icon: 'menu_book', href: '/dashboard/kegiatan' },
    { name: 'Documents', icon: 'folder_open', href: '/dashboard/berkas' },
    { name: 'Profile', icon: 'person', href: '/dashboard/profil' },
  ]

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Sidebar Navigation (Desktop) */}
      <aside className="hidden md:flex flex-col h-screen fixed left-0 top-0 w-[280px] bg-[var(--surface)] border-r border-[var(--outline-variant)] py-6 px-4 z-50">
        <div className="flex items-center gap-3 px-2 mb-10">
          <img alt="Logo" className="h-10 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-lj9NJ-_cWVcQUmdvNr69F-tbJGVE3Q0NWDbyArku3-5TDLWEF8OixM-dkAUw-U6roZH596Rfl-_d5Dj0qoqpZzaf3-wq0iNstPmaTR0g_YFaXy-exQBwMRm398AJSyh-QfM2Zn36csPwxhaDUGWbGpG5yDF8Ax7j1RjGXKgpQxRyn2W55SieA7iKzPvz4COQcA3xIJYxaUJW4pIBOYKBf_CvyyU80x6M-kDiPKAmuDqpIVkXMjKuuE8RBzMhDHi81_b2nEHvvA"/>
          <div>
            <h2 className="text-[14px] font-bold text-[var(--on-surface)] leading-tight">Magang PRDC</h2>
            <p className="text-[12px] text-[var(--on-surface-variant)]">Student Portal</p>
          </div>
        </div>
        
        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                  isActive 
                    ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)] font-bold' 
                    : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]'
                }`}
              >
                {isActive && <div className="absolute left-0 w-1 h-6 bg-[var(--primary)] rounded-r-full" />}
                <span className={`material-symbols-outlined ${isActive ? 'fill-1' : ''}`} style={{ fontVariationSettings: isActive ? "'FILL' 1" : "" }}>
                  {item.icon}
                </span>
                <span className="text-[14px] font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-[var(--outline-variant)] pt-4">
          <button 
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-[var(--on-surface-variant)] hover:bg-[var(--error-container)] hover:text-[var(--on-error-container)] rounded-xl transition-all"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-[14px] font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-[280px] flex flex-col">
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-6 md:px-10 h-16 bg-[var(--surface)] border-b border-[var(--outline-variant)] sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-[var(--on-surface)]">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <span className="hidden sm:inline-block text-[20px] font-bold text-[var(--on-surface)]">Portal Magang</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)] transition-colors rounded-full relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--error)] rounded-full"></span>
            </button>
            
            <div className="hidden sm:flex items-center gap-3 py-1.5 px-3 rounded-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)]">
              <span className="text-[14px] font-medium text-[var(--on-surface)]">{profile?.nama_lengkap}</span>
              <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--surface-container-highest)] border border-[var(--outline)]">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--primary-container)] text-[var(--on-primary-container)] font-bold">
                    {profile?.nama_lengkap?.charAt(0)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 md:p-10 max-w-[1440px] mx-auto w-full flex-1">
          {children}
        </div>

        {/* Bottom Navigation (Mobile) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--outline-variant)] flex justify-around items-center h-16 px-4 z-50">
          {menuItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center gap-1 ${isActive ? 'text-[var(--primary)] font-bold' : 'text-[var(--on-surface-variant)]'}`}>
                <span className={`material-symbols-outlined ${isActive ? 'fill-1' : ''}`} style={{ fontVariationSettings: isActive ? "'FILL' 1" : "" }}>
                  {item.icon}
                </span>
                <span className="text-[10px]">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </main>
    </div>
  )
}
