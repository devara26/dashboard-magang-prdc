'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, CalendarCheck, List, LogOut, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [profileName, setProfileName] = useState('Memuat...')
  const [role, setRole] = useState('Mahasiswa')
  const [initial, setInitial] = useState('U')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('nama_lengkap')
        .eq('id', user.id)
        .single()

      if (data && data.nama_lengkap) {
        setProfileName(data.nama_lengkap)
        setInitial(data.nama_lengkap.charAt(0).toUpperCase())
      } else {
        setProfileName('User Magang')
      }
    }
    fetchUser()
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

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
  ]

  const actionItems = [
    { name: 'Jurnal Kegiatan', href: '/dashboard/kegiatan', icon: List },
  ]

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#F8F9FA] text-[#202124] overflow-hidden font-sans selection:bg-blue-200">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 z-20 shadow-sm">
        <div className="flex items-center">
          <img src="/orbit-logo.png" alt="Orbit Logo" className="h-8 w-auto object-contain" />
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-[#5F6368] hover:bg-gray-100 rounded-full transition-colors">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar: Clean White Material Design */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-40 w-64 md:w-64 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col shadow-lg md:shadow-sm transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center">
            <img src="/orbit-logo.png" alt="Orbit Logo" className="h-8 w-auto object-contain" />
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-[#5F6368] hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          <div>
            <p className="px-3 text-xs font-medium text-[#5F6368] uppercase tracking-wider mb-2">Menu Utama</p>
            <div className="space-y-0.5">
              {navItems.map((item) => {
                const active = pathname === item.href
                return (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-full transition-colors ${
                      active 
                        ? 'bg-[#E8F0FE] text-[#1967D2]' 
                        : 'text-[#3C4043] hover:bg-[#F1F3F4]'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#1967D2]' : 'text-[#5F6368]'}`} />
                    <span className="text-sm font-medium truncate">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div>
            <p className="px-3 text-xs font-medium text-[#5F6368] uppercase tracking-wider mb-2">Kegiatan</p>
            <div className="space-y-0.5">
              {actionItems.map((item) => {
                const active = pathname === item.href
                return (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-full transition-colors ${
                      active 
                        ? 'bg-[#E8F0FE] text-[#1967D2]' 
                        : 'text-[#3C4043] hover:bg-[#F1F3F4]'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#1967D2]' : 'text-[#5F6368]'}`} />
                    <span className="text-sm font-medium truncate">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>

        <div className="p-3 border-t border-gray-200 bg-white">
           <Link href="/dashboard/profil" className="flex items-center gap-3 px-3 py-2 rounded-full hover:bg-[#F1F3F4] transition-colors cursor-pointer group">
              <div className="w-8 h-8 flex-shrink-0 rounded-full bg-[#34A853] text-white flex items-center justify-center font-medium text-sm">
                {initial}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-[#202124] truncate">{profileName}</p>
                <p className="text-xs text-[#5F6368] truncate">{role}</p>
              </div>
              <button onClick={handleLogout} className="p-1.5 flex-shrink-0 rounded-full hover:bg-[#FCE8E6] transition-colors group/btn z-20" title="Keluar">
                <LogOut className="w-4 h-4 text-[#5F6368] group-hover/btn:text-[#EA4335] transition-colors" />
              </button>
           </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10 p-4 md:p-8">
        <div className="max-w-6xl mx-auto pb-8 md:pb-0">
          {children}
        </div>
      </main>
      
    </div>
  )
}