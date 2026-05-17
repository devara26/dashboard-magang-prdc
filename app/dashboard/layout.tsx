'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  BookOpen, 
  FolderOpen, 
  User, 
  LogOut, 
  Bell, 
  Search, 
  ChevronRight, 
  Menu 
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

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

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (error) console.error('Layout Profile Error:', error)

        if (!data) {
          console.warn('Profile not found for user:', user.id)
          setProfile({ id: user.id, nama_lengkap: 'Pengguna ORBIT', role: 'mahasiswa' })
        } else {
          if (data.role === 'dosen') {
            return router.push('/dosen')
          }
          setProfile(data)
        }
      } catch (err) {
        console.error('Runtime CheckUser Error:', err)
      } finally {
        setLoading(false)
      }
    }
    checkUser()
  }, [router])

  if (loading) return (
    <div className="fixed inset-0 z-[999] bg-[#F8F9FA] flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="w-16 h-16 border-4 border-[#0066FF] border-t-transparent rounded-full animate-spin mx-auto shadow-sm"></div>
        <p className="text-[#202124] font-bold text-lg tracking-tight">Menyelaraskan Dashboard...</p>
      </div>
    </div>
  )

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Absensi', icon: Calendar, href: '/dashboard/absensi' },
    { name: 'Pembimbing', icon: Users, href: '/dashboard/pembimbing' },
    { name: 'Jurnal', icon: BookOpen, href: '/dashboard/kegiatan' },
    { name: 'Berkas', icon: FolderOpen, href: '/dashboard/berkas' },
    { name: 'Profil', icon: User, href: '/dashboard/profil' },
  ]

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--text-main)] font-sans antialiased">
      {/* Sidebar - Clean White & Premium */}
      <aside className="hidden lg:flex flex-col w-[300px] h-screen sticky top-0 bg-white border-r border-gray-200/50 px-8 py-12">
        <div className="px-4 mb-14">
          <img src="/logoorbitsvg.svg" alt="Orbit Logo" className="h-10 w-auto object-contain" />
        </div>

        <div className="flex-1 space-y-12">
          <div>
            <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-[0.2em] mb-8 px-4">Menu Utama</p>
            <nav className="space-y-3">
              {menuItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-4 px-6 py-4 rounded-[16px] transition-all duration-300 group ${
                      isActive 
                        ? 'accent-gradient text-white shadow-lg' 
                        : 'text-[var(--text-muted)] hover:bg-gray-100 hover:text-[var(--text-main)]'
                    }`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-[var(--text-light)] group-hover:text-[var(--accent-blue)]'} />
                    <span className="label-orbit font-bold">{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        <div className="mt-auto pt-10 border-t border-gray-100 space-y-6">
           <Link href="/dashboard/profil" className="flex items-center gap-4 p-5 bg-gray-50 rounded-[20px] border border-transparent hover:border-[var(--accent-blue)]/20 transition-all group">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                 {profile?.avatar_url ? (
                   <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center font-bold text-[var(--accent-blue)] text-lg">
                     {profile?.nama_lengkap?.charAt(0)}
                   </div>
                 )}
              </div>
              <div className="min-w-0">
                 <p className="body2-orbit font-bold text-[var(--text-main)] truncate">{profile?.nama_lengkap?.split(' ')[0]}</p>
                 <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-wider truncate">{profile?.nim || 'Mahasiswa'}</p>
              </div>
           </Link>
           
           <button 
             onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
             className="flex w-full items-center gap-4 px-6 py-4 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 rounded-[16px] transition-all body2-orbit font-bold"
           >
             <LogOut size={20} strokeWidth={2} />
             Keluar
           </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar - Minimalist */}
        <header className="h-[90px] bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-30 px-8 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button className="lg:hidden w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-[var(--text-main)]">
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-3 text-[var(--text-light)] caption-orbit font-bold tracking-tight">
              <span className="hover:text-[var(--text-main)] transition-colors cursor-pointer">ORBIT</span>
              <ChevronRight size={16} className="opacity-40" />
              <span className="text-[var(--text-main)] uppercase tracking-wider">{pathname.split('/').pop()?.charAt(0).toUpperCase()}{pathname.split('/').pop()?.slice(1) || 'DASHBOARD'}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="hidden md:flex items-center gap-3 bg-gray-100 rounded-full px-6 py-3 w-72 group focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--accent-blue)]/20 transition-all border border-transparent focus-within:border-[var(--accent-blue)]/30">
                <Search size={18} className="text-[var(--text-light)]" />
                <input placeholder="Cari data..." className="bg-transparent border-none outline-none body2-orbit font-semibold w-full placeholder:text-[var(--text-light)] text-[var(--text-main)]" />
             </div>
             
             <div className="flex items-center">
                <NotificationBell />
             </div>
             
             <div className="lg:hidden w-10 h-10 rounded-full overflow-hidden accent-gradient shadow-lg flex items-center justify-center text-white text-sm font-bold">
                {profile?.nama_lengkap?.charAt(0)}
             </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </div>

        {/* Mobile Nav - Refined */}
        <nav className="lg:hidden fixed bottom-8 left-8 right-8 bg-white/90 backdrop-blur-xl border border-gray-100 h-20 rounded-[24px] flex justify-around items-center z-50 shadow-2xl">
           {menuItems.slice(0, 4).map((item) => {
             const isActive = pathname === item.href
             const Icon = item.icon
             return (
               <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center w-14 h-14 rounded-[16px] transition-all ${isActive ? 'accent-gradient text-white shadow-lg' : 'text-[var(--text-light)] hover:text-[var(--text-main)]'}`}>
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
               </Link>
             )
           })}
        </nav>
      </main>
    </div>
  )
}
