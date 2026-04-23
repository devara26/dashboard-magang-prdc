'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, CalendarCheck, List, User, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [profileName, setProfileName] = useState('Memuat...')
  const [role, setRole] = useState('Mahasiswa')
  const [initial, setInitial] = useState('U')

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
    // Menggunakan bg-[#F8F9FA] sebagai background ala Google
    <div className="flex h-screen w-full bg-[#F8F9FA] text-[#202124] overflow-hidden font-sans selection:bg-blue-200">
      
      {/* Sidebar: Clean White Material Design */}
      <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col z-10 shadow-sm">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-medium tracking-tight flex items-center gap-2 text-[#5F6368]">
            <div className="w-8 h-8 rounded bg-[#4285F4] flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            Platform <span className="text-[#4285F4] font-semibold">Magang</span>
          </h1>
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
                    <item.icon className={`w-5 h-5 ${active ? 'text-[#1967D2]' : 'text-[#5F6368]'}`} />
                    <span className="text-sm font-medium">{item.name}</span>
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
                    <item.icon className={`w-5 h-5 ${active ? 'text-[#1967D2]' : 'text-[#5F6368]'}`} />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>

        <div className="p-3 border-t border-gray-200 bg-white">
           <Link href="/dashboard/profil" className="flex items-center gap-3 px-3 py-2 rounded-full hover:bg-[#F1F3F4] transition-colors cursor-pointer group">
              <div className="w-8 h-8 rounded-full bg-[#34A853] text-white flex items-center justify-center font-medium text-sm">
                {initial}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-[#202124] truncate">{profileName}</p>
                <p className="text-xs text-[#5F6368]">{role}</p>
              </div>
              <button onClick={handleLogout} className="p-1.5 rounded-full hover:bg-[#FCE8E6] transition-colors group/btn z-20" title="Keluar">
                <LogOut className="w-4 h-4 text-[#5F6368] group-hover/btn:text-[#EA4335] transition-colors" />
              </button>
           </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10 p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
      
    </div>
  )
}