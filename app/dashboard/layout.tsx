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
    <div className="flex h-screen items-center justify-center bg-[#F4F4F4]">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-[#0066FF] rounded-full animate-spin" />
    </div>
  )

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Presence', icon: Calendar, href: '/dashboard/absensi' },
    { name: 'Mentor', icon: Users, href: '/dashboard/pembimbing' },
    { name: 'Journal', icon: BookOpen, href: '/dashboard/kegiatan' },
    { name: 'Documents', icon: FolderOpen, href: '/dashboard/berkas' },
    { name: 'Profile', icon: User, href: '/dashboard/profil' },
  ]

  return (
    <div className="flex min-h-screen bg-[#F4F4F4] text-[#1A1A1A] font-sans antialiased">
      {/* Sidebar - Clean White & Premium */}
      <aside className="hidden lg:flex flex-col w-[280px] h-screen sticky top-0 bg-white border-r border-[#E8E8E8] px-6 py-10">
        <div className="px-4 mb-12">
          <img src="/logoorbitsvg.svg" alt="Orbit Logo" className="h-10 w-auto object-contain" />
        </div>

        <div className="flex-1 space-y-10">
          <div>
            <p className="text-[11px] font-black text-[#A0A0A0] uppercase tracking-[0.15em] mb-6 px-4">Home</p>
            <nav className="space-y-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-5 py-3.5 rounded-full transition-all duration-300 group ${
                      isActive 
                        ? 'bg-[#0066FF] text-white shadow-lg shadow-blue-200' 
                        : 'text-[#666666] hover:bg-[#F4F4F4] hover:text-[#1A1A1A]'
                    }`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-[#A0A0A0] group-hover:text-[#0066FF]'} />
                    <span className="text-[14px] font-bold tracking-tight">{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        <div className="mt-auto pt-8 border-t border-[#E8E8E8] space-y-4">
           <Link href="/dashboard/profil" className="flex items-center gap-3 p-4 bg-[#F4F4F4] rounded-[24px] border border-transparent hover:border-[#0066FF]/30 transition-all group">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-[#E8E8E8] shadow-sm">
                 {profile?.avatar_url ? (
                   <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center font-black text-[#0066FF] text-sm">
                     {profile?.nama_lengkap?.charAt(0)}
                   </div>
                 )}
              </div>
              <div className="min-w-0">
                 <p className="text-[13px] font-bold text-[#1A1A1A] truncate">{profile?.nama_lengkap?.split(' ')[0]}</p>
                 <p className="text-[10px] font-black text-[#A0A0A0] uppercase tracking-wider truncate">{profile?.nim || 'Student'}</p>
              </div>
           </Link>
           
           <button 
             onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
             className="flex w-full items-center gap-3 px-5 py-3.5 text-[#666666] hover:text-red-600 hover:bg-red-50 rounded-full transition-all text-[13px] font-bold"
           >
             <LogOut size={18} strokeWidth={2} />
             Logout
           </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar - Minimalist */}
        <header className="h-[80px] bg-white/70 backdrop-blur-xl border-b border-[#E8E8E8] sticky top-0 z-30 px-6 lg:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full bg-[#F4F4F4] hover:bg-gray-200 transition-colors text-[#1A1A1A]">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2.5 text-[#A0A0A0] text-[13px] font-bold tracking-tight">
              <span className="hover:text-[#1A1A1A] transition-colors cursor-pointer">Orbit</span>
              <ChevronRight size={14} className="opacity-40" />
              <span className="text-[#1A1A1A]">{pathname.split('/').pop()?.charAt(0).toUpperCase()}{pathname.split('/').pop()?.slice(1) || 'Dashboard'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2.5 bg-[#F4F4F4] rounded-full px-5 py-2.5 w-64 group focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0066FF]/20 transition-all border border-transparent focus-within:border-[#0066FF]/30">
                <Search size={16} className="text-[#A0A0A0]" />
                <input placeholder="Search data..." className="bg-transparent border-none outline-none text-[13px] font-semibold w-full placeholder:text-[#A0A0A0] text-[#1A1A1A]" />
                <div className="flex items-center gap-1 opacity-40">
                   <span className="text-[10px] font-black">⌘</span>
                   <span className="text-[10px] font-black">K</span>
                </div>
             </div>
             
             <button className="w-10 h-10 flex items-center justify-center text-[#666666] bg-[#F4F4F4] hover:bg-white hover:shadow-sm border border-transparent hover:border-[#E8E8E8] rounded-full relative transition-all group">
                <Bell size={18} className="group-hover:text-[#0066FF] transition-colors" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#0066FF] rounded-full border-2 border-white"></span>
             </button>
             
             <div className="lg:hidden w-9 h-9 rounded-full overflow-hidden bg-[#0066FF] shadow-lg shadow-blue-200 flex items-center justify-center text-white text-xs font-black">
                {profile?.nama_lengkap?.charAt(0)}
             </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </div>

        {/* Mobile Nav - Refined */}
        <nav className="lg:hidden fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-xl border border-[#E8E8E8] h-16 rounded-full flex justify-around items-center z-50 shadow-2xl">
           {menuItems.slice(0, 4).map((item) => {
             const isActive = pathname === item.href
             const Icon = item.icon
             return (
               <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all ${isActive ? 'bg-[#0066FF] text-white' : 'text-[#A0A0A0] hover:text-[#1A1A1A]'}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
               </Link>
             )
           })}
        </nav>
      </main>
    </div>
  )
}
