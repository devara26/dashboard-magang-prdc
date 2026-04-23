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
    // Menggunakan bg-zinc-950 sebagai background gelap premium
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-cyan-500/30">
      
      {/* Background Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Sidebar: Glassmorphism effect */}
      <aside className="w-64 flex-shrink-0 border-r border-white/5 bg-white/[0.02] backdrop-blur-xl flex flex-col relative z-10">
        <div className="h-20 flex items-center px-8 border-b border-white/5">
          <h1 className="text-xl font-bold tracking-wide flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white text-sm font-extrabold">M</span>
            </div>
            MAGANG<span className="text-cyan-400">.</span>
          </h1>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto">
          <div>
            <p className="px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Menu Utama</p>
            <div className="space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.href
                return (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                      active 
                        ? 'bg-gradient-to-r from-blue-500/10 to-cyan-400/10 text-cyan-400 border border-cyan-400/20 shadow-[inset_0px_0px_20px_rgba(34,211,238,0.05)]' 
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div>
            <p className="px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Kegiatan</p>
            <div className="space-y-1">
              {actionItems.map((item) => {
                const active = pathname === item.href
                return (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                      active 
                        ? 'bg-gradient-to-r from-blue-500/10 to-cyan-400/10 text-cyan-400 border border-cyan-400/20 shadow-[inset_0px_0px_20px_rgba(34,211,238,0.05)]' 
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-white/5 bg-black/20">
           <Link href="/dashboard/profil" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-300 font-bold group-hover:border-cyan-500/50 transition-colors">
                {initial}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-zinc-100 group-hover:text-cyan-400 transition-colors truncate">{profileName}</p>
                <p className="text-xs text-zinc-500">{role}</p>
              </div>
              <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors group/btn z-20" title="Keluar">
                <LogOut className="w-4 h-4 text-zinc-600 group-hover/btn:text-red-400 transition-colors" />
              </button>
           </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
      
    </div>
  )
}