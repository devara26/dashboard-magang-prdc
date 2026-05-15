'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, CalendarCheck, List, LogOut, User, Menu, Users, FolderOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import NotificationBell from '@/components/NotificationBell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [profileName, setProfileName] = useState('Memuat...')
  const [role, setRole] = useState('Mahasiswa')
  const [initial, setInitial] = useState('U')
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
        setRole(data.role || 'Mahasiswa')
        setAvatarUrl(data.avatar_url)
      } else {
        setProfileName('User Magang')
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
    { name: 'Beranda', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Absensi Harian', href: '/dashboard/absensi', icon: CalendarCheck },
    { name: 'Dosen Pembimbing', href: '/dashboard/pembimbing', icon: Users },
  ]

  const actionItems = [
    { name: 'Jurnal Kegiatan', href: '/dashboard/kegiatan', icon: List },
    { name: 'Berkas Magang', href: '/dashboard/berkas', icon: FolderOpen },
  ]

  const bottomNavItems = [
    { name: 'Beranda', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Absensi', href: '/dashboard/absensi', icon: CalendarCheck },
    { name: 'Jurnal', href: '/dashboard/kegiatan', icon: List },
    { name: 'Profil', href: '/dashboard/profil', icon: User },
  ]

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#F8F9FC] text-[#202124] overflow-hidden selection:bg-blue-100">

      {/* Sidebar: Desktop Only (Modern White Design) */}
      <aside className={`hidden md:flex inset-y-0 left-0 z-40 flex-shrink-0 border-r border-gray-100 bg-white flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
        <div className="h-20 flex items-center px-8">
          <div className="flex items-center gap-4 overflow-hidden">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-[#5F6368] hover:text-[#1A73E8] transition-colors flex-shrink-0">
              <Menu className="w-6 h-6" />
            </button>
            {isSidebarOpen && <img src="/logoorbitsvg.svg" alt="Orbit Logo" className="h-9 w-auto object-contain" />}
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-8 overflow-y-auto no-scrollbar">
          <div>
            {isSidebarOpen && <p className="px-4 text-[11px] font-bold text-[#9AA0A6] uppercase tracking-[0.1em] mb-4">Dashboard</p>}
            <div className="space-y-1.5">
              {navItems.map((item) => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 ${active
                        ? 'bg-[#E8F0FE] text-[#1A73E8] shadow-sm'
                        : 'text-[#5F6368] hover:bg-gray-50 hover:text-[#1A73E8]'
                      } ${!isSidebarOpen ? 'justify-center px-0' : ''}`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#1A73E8]' : 'text-[#5F6368]'}`} />
                    {isSidebarOpen && <span className="text-[14px] font-semibold">{item.name}</span>}
                  </Link>
                )
              })}
            </div>
          </div>

          <div>
            {isSidebarOpen && <p className="px-4 text-[11px] font-bold text-[#9AA0A6] uppercase tracking-[0.1em] mb-4">Activities</p>}
            <div className="space-y-1.5">
              {actionItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 ${active
                        ? 'bg-[#E8F0FE] text-[#1A73E8] shadow-sm'
                        : 'text-[#5F6368] hover:bg-gray-50 hover:text-[#1A73E8]'
                      } ${!isSidebarOpen ? 'justify-center px-0' : ''}`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#1A73E8]' : 'text-[#5F6368]'}`} />
                    {isSidebarOpen && <span className="text-[14px] font-semibold">{item.name}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-50 bg-white">
          <button onClick={handleLogout} className={`flex items-center ${!isSidebarOpen ? 'justify-center' : 'gap-3.5'} px-4 py-3 rounded-xl hover:bg-red-50 text-[#5F6368] hover:text-[#EA4335] transition-all duration-200 w-full group`} title="Keluar">
            <LogOut className="w-5 h-5 flex-shrink-0 group-hover:rotate-180 transition-transform duration-500" />
            {isSidebarOpen && <span className="text-[14px] font-semibold">Keluar Aplikasi</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F8F9FA] z-10 relative transition-colors">
        
        <header className="hidden md:flex h-16 items-center justify-end px-8 border-b border-gray-200 bg-white shrink-0 gap-4 transition-colors">
          <NotificationBell />
          <Link href="/dashboard/profil" className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-[#303134] p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-gray-200 dark:hover:border-[#3C4043]">
            <div className="text-right">
              <p className="text-sm font-bold text-[#202124] dark:text-[#E8EAED]">{profileName}</p>
            </div>
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-[#1A73E8] text-white flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : initial}
              </div>
              <div className="absolute -bottom-1 -right-2 bg-[#1A73E8] text-white text-[9px] font-bold px-1.5 py-0.5 rounded border border-white shadow-sm uppercase tracking-wider">
                MHS
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
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-3 w-full transition-colors ${
                active ? 'text-[#1A73E8]' : 'text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-white'
              }`}
            >
              <div className={`p-1 rounded-full mb-1 ${active ? 'bg-[#E8F0FE] dark:bg-[#3C4043]' : ''}`}>
                <item.icon className={`w-5 h-5 ${active ? 'text-[#1A73E8]' : 'text-[#5F6368] dark:text-[#9AA0A6]'}`} />
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-[#1A73E8]' : 'text-[#5F6368] dark:text-[#9AA0A6]'}`}>{item.name}</span>
            </Link>
          )
        })}
      </nav>

    </div>
  )
}
