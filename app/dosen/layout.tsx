'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Users, CheckSquare, LogOut, User, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import NotificationBell from '@/components/NotificationBell'
import ThemeToggle from '@/components/ThemeToggle'

export default function DosenLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [profileName, setProfileName] = useState('Memuat...')
  const [role, setRole] = useState('Dosen')
  const [initial, setInitial] = useState('D')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('nama_lengkap, role, avatar_url')
        .eq('id', user.id)
        .single()

      if (data && data.nama_lengkap) {
        setProfileName(data.nama_lengkap)
        setInitial(data.nama_lengkap.charAt(0).toUpperCase())
        setRole(data.role || 'Dosen')
        setAvatarUrl(data.avatar_url)
      } else {
        setProfileName('Dosen Orbit')
      }
    }
    fetchUser()
  }, [])

  async function handleLogout(e: React.MouseEvent) {
    e.preventDefault()
    if (confirm('Apakah Anda yakin ingin keluar?')) {
      await supabase.auth.signOut()
      router.push('/login')
    }
  }

  const navItems = [
    { name: 'Beranda Dosen', href: '/dosen', icon: Home },
    { name: 'Monitoring Mahasiswa', href: '/dosen/mahasiswa', icon: Users },
    { name: 'Persetujuan Laporan', href: '/dosen/persetujuan-laporan', icon: CheckSquare },
  ]

  const bottomNavItems = [
    { name: 'Beranda', href: '/dosen', icon: Home },
    { name: 'Monitor', href: '/dosen/mahasiswa', icon: Users },
    { name: 'Laporan', href: '/dosen/persetujuan-laporan', icon: CheckSquare },
    { name: 'Profil', href: '/dosen/profil', icon: User },
  ]

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#F8F9FA] text-[#202124] overflow-hidden font-sans selection:bg-blue-200">

      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-center bg-white border-b border-gray-200 px-4 h-14 z-20 shadow-sm relative shrink-0">
        <img src="/logoorbitsvg.svg" alt="Orbit Logo" className="h-10 w-auto object-contain" />
      </div>

      {/* Sidebar: Desktop Only (Dark Mode) */}
      <aside className={`hidden md:flex inset-y-0 left-0 z-40 flex-shrink-0 border-r border-[#3C4043] bg-[#202124] flex-col shadow-lg transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#3C4043]">
          <div className="flex items-center gap-3 overflow-hidden">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-[#9AA0A6] hover:text-white transition-colors flex-shrink-0">
              <Menu className="w-6 h-6" />
            </button>
            {isSidebarOpen && <img src="/logoorbitsvg.svg" alt="Orbit Logo" className="h-10 w-auto object-contain invert brightness-200" />}
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-6 overflow-y-auto overflow-x-hidden">
          <div>
            {isSidebarOpen && <p className="px-3 text-[10px] font-bold text-[#9AA0A6] uppercase tracking-widest mb-3">Menu Utama</p>}
            <div className="space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.href || (item.href !== '/dosen' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={!isSidebarOpen ? item.name : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active
                        ? 'bg-[#3C4043] text-white'
                        : 'text-[#9AA0A6] hover:bg-[#303134] hover:text-white'
                      } ${!isSidebarOpen ? 'justify-center' : ''}`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-[#9AA0A6]'}`} />
                    {isSidebarOpen && <span className="text-sm font-medium truncate">{item.name}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>

        <div className="p-3 border-t border-[#3C4043] bg-[#202124]">
          <div className="flex flex-col gap-2">
            <button onClick={handleLogout} className={`flex items-center ${!isSidebarOpen ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg hover:bg-[#3C4043] text-[#9AA0A6] hover:text-[#EA4335] transition-colors w-full`} title="Keluar">
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && <span className="text-sm font-medium">Keluar</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F8F9FA] dark:bg-[#121212] z-10 relative transition-colors">
        
        {/* Top Right Profile Header (Desktop) */}
        <header className="hidden md:flex h-16 items-center justify-end px-8 border-b border-gray-200 dark:border-[#3C4043] bg-white dark:bg-[#202124] shrink-0 gap-4 transition-colors">
          <ThemeToggle />
          <NotificationBell />
          <Link href="/dosen/profil" className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-[#303134] p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-gray-200 dark:hover:border-[#3C4043]">
            <div className="text-right">
              <p className="text-sm font-bold text-[#202124] dark:text-[#E8EAED]">{profileName}</p>
            </div>
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-[#137333] text-white flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : initial}
              </div>
              <div className="absolute -bottom-1 -right-2 bg-[#137333] text-white text-[9px] font-bold px-1.5 py-0.5 rounded border border-white shadow-sm uppercase tracking-wider">
                DOSEN
              </div>
            </div>
          </Link>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#202124] border-t border-gray-200 dark:border-[#3C4043] flex items-center justify-around z-40 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {bottomNavItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/dosen' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-3 w-full transition-colors ${
                active ? 'text-[#137333]' : 'text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-white'
              }`}
            >
              <div className={`p-1 rounded-full mb-1 ${active ? 'bg-[#E6F4EA] dark:bg-[#3C4043]' : ''}`}>
                <item.icon className={`w-5 h-5 ${active ? 'text-[#137333]' : 'text-[#5F6368] dark:text-[#9AA0A6]'}`} />
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-[#137333]' : 'text-[#5F6368] dark:text-[#9AA0A6]'}`}>{item.name}</span>
            </Link>
          )
        })}
      </nav>

    </div>
  )
}
