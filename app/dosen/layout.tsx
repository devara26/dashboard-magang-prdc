'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Users, LogOut, User, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DosenLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [profileName, setProfileName] = useState('Memuat...')
  const [role, setRole] = useState('Dosen')
  const [initial, setInitial] = useState('D')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('nama_lengkap, role')
        .eq('id', user.id)
        .single()

      if (data && data.nama_lengkap) {
        setProfileName(data.nama_lengkap)
        setInitial(data.nama_lengkap.charAt(0).toUpperCase())
        setRole(data.role || 'Dosen')
      } else {
        setProfileName('Dosen')
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
    { name: 'Daftar Mahasiswa', href: '/dosen', icon: Users },
  ]

  const bottomNavItems = [
    { name: 'Mahasiswa', href: '/dosen', icon: Users },
    { name: 'Profil', href: '/dosen/profil', icon: User },
  ]

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#F8F9FA] text-[#202124] overflow-hidden font-sans selection:bg-blue-200">

      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-center bg-white border-b border-gray-100 px-4 h-14 z-20 shadow-sm relative">
        <img src="/orbit-logo.svg" alt="Orbit Logo" className="h-10 w-auto object-contain scale-150 origin-center" />
      </div>

      {/* Sidebar: Desktop Only */}
      <aside className={`hidden md:flex inset-y-0 left-0 z-40 flex-shrink-0 border-r border-gray-200 bg-white flex-col shadow-sm transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center gap-3 overflow-hidden">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-[#5F6368] hover:text-[#202124] transition-colors flex-shrink-0">
              <Menu className="w-6 h-6" />
            </button>
            {isSidebarOpen && <img src="/orbit-logo.svg" alt="Orbit Logo" className="h-8 w-auto object-contain flex-shrink-0" />}
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto overflow-x-hidden">
          <div>
            {isSidebarOpen && <p className="px-3 text-xs font-medium text-[#5F6368] uppercase tracking-wider mb-2">Menu Utama</p>}
            <div className="space-y-0.5">
              {navItems.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={!isSidebarOpen ? item.name : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-full transition-colors ${active
                        ? 'bg-[#E8F0FE] text-[#1A73E8]'
                        : 'text-[#3C4043] hover:bg-[#F1F3F4]'
                      } ${!isSidebarOpen ? 'justify-center' : ''}`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#1A73E8]' : 'text-[#5F6368]'}`} />
                    {isSidebarOpen && <span className="text-sm font-medium truncate">{item.name}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>

        <div className="p-3 border-t border-gray-200 bg-white">
          <div className="flex flex-col gap-2">
            <Link href="/dosen/profil" className={`flex items-center ${!isSidebarOpen ? 'justify-center' : 'gap-3'} px-2 py-2 rounded-xl hover:bg-[#F1F3F4] transition-colors group cursor-pointer`}>
              <div className="w-8 h-8 flex-shrink-0 rounded-full bg-[#1A73E8] text-white flex items-center justify-center font-medium text-sm">
                {initial}
              </div>
              {isSidebarOpen && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-[#202124] truncate">{profileName}</p>
                  <p className="text-xs text-[#5F6368] truncate capitalize">{role}</p>
                </div>
              )}
              {isSidebarOpen && (
                <button onClick={handleLogout} className="p-1.5 flex-shrink-0 rounded-full hover:bg-[#FCE8E6] transition-colors z-20" title="Keluar">
                  <LogOut className="w-4 h-4 text-[#5F6368] hover:text-[#EA4335] transition-colors" />
                </button>
              )}
            </Link>
            {!isSidebarOpen && (
              <button onClick={handleLogout} className="p-2 mx-auto rounded-full hover:bg-[#FCE8E6] transition-colors" title="Keluar">
                <LogOut className="w-4 h-4 text-[#5F6368] hover:text-[#EA4335] transition-colors" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around z-40 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {bottomNavItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-3 w-full transition-colors ${
                active ? 'text-[#1A73E8]' : 'text-[#5F6368] hover:text-[#202124]'
              }`}
            >
              <div className={`p-1 rounded-full mb-1 ${active ? 'bg-[#E8F0FE]' : ''}`}>
                <item.icon className={`w-5 h-5 ${active ? 'text-[#1A73E8]' : 'text-[#5F6368]'}`} />
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-[#1A73E8]' : 'text-[#5F6368]'}`}>{item.name}</span>
            </Link>
          )
        })}
      </nav>

    </div>
  )
}
