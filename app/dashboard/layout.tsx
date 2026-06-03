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
  ChevronRight,
  Menu,
  X,
  Search,
  ClipboardList
} from 'lucide-react'

import Header from '@/components/Header'
import AppTour from '@/components/AppTour'

export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  
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

  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [pathname])

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
    { name: 'Bimbingan', icon: ClipboardList, href: '/dashboard/bimbingan' },
    { name: 'Jurnal', icon: BookOpen, href: '/dashboard/kegiatan' },
    { name: 'Berkas', icon: FolderOpen, href: '/dashboard/berkas' },
    { name: 'Profil', icon: User, href: '/dashboard/profil' },
  ]

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--text-main)] font-sans antialiased">
      {profile && profile.has_seen_tour === false && pathname === '/dashboard' && (
        <AppTour
          userId={profile.id}
          isMobileSidebarOpen={isMobileSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
          onComplete={() => {
            setProfile((prev: any) => prev ? { ...prev, has_seen_tour: true } : null)
          }}
        />
      )}

      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-[300px] h-screen bg-white border-r border-gray-200/50 px-8 py-12 flex flex-col justify-between transition-all duration-300 ease-in-out lg:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}>
        <div>
          <div className="px-4 mb-14 flex items-center justify-between">
            <img src="/logoorbitsvg.svg" alt="Orbit Logo" className="h-10 w-auto object-contain" />
            <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 lg:hidden">
              <X size={20} />
            </button>
          </div>

          <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-[0.2em] mb-8 px-4">Menu Utama</p>
          <nav className="space-y-3">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  id={
                    item.name === 'Dashboard' ? 'tour-dashboard' :
                    item.name === 'Absensi' ? 'tour-absensi' :
                    item.name === 'Pembimbing' ? 'tour-pembimbing' :
                    item.name === 'Bimbingan' ? 'tour-bimbingan' :
                    item.name === 'Jurnal' ? 'tour-jurnal' :
                    item.name === 'Berkas' ? 'tour-berkas' :
                    undefined
                  }
                  href={item.href}
                  className={`flex items-center gap-4 px-6 py-4 rounded-[16px] transition-all duration-300 group ${isActive
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? '!text-white' : 'text-gray-400 group-hover:text-blue-600'} />
                  <span className={`label-orbit font-bold ${isActive ? '!text-white' : 'text-gray-700 group-hover:text-blue-600'}`}>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* --- SEKSI PROFIL: Rapi di Bawah Sidebar --- */}
        <div className="mt-auto border-t border-gray-100 pt-6 px-4 space-y-5">
          {/* Profil Pengguna: Tata Letak Rapi */}
          <Link href="/dashboard/profil" className="bg-gray-50 p-4 rounded-xl border flex items-center gap-3 hover:bg-gray-100 transition-colors">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-gray-200 shadow-sm flex items-center justify-center shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-blue-600 text-base">
                  {profile?.nama_lengkap?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-gray-950 truncate">{profile?.nama_lengkap || 'Pengguna ORBIT'}</p>
              <p className="text-xs text-gray-500 font-medium truncate">NIM: {profile?.nim || 'Mahasiswa'}</p>
            </div>
          </Link>

          {/* Tombol Keluar: Penegasan Jelas --- */}
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            className="w-full flex items-center justify-center gap-2.5 p-3 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition text-sm cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col min-h-screen lg:pl-[300px]">
        <header className="h-[90px] bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-30 px-6 md:px-8 lg:px-12 flex items-center justify-between w-full">
          <div className="flex items-center gap-4 md:gap-6">
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-[var(--text-main)] active:scale-95"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-3 text-[var(--text-light)] caption-orbit font-bold tracking-tight">
              <span onClick={() => router.push('/dashboard')} className="hover:text-[var(--text-main)] transition-colors cursor-pointer">ORBIT</span>
              <ChevronRight size={16} className="opacity-40" />
              <span className="text-[var(--text-main)] uppercase tracking-wider">{pathname.split('/').pop()?.charAt(0).toUpperCase()}{pathname.split('/').pop()?.slice(1) || 'DASHBOARD'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <div className="hidden md:flex items-center gap-3 bg-gray-100 rounded-full px-6 py-3 w-60 lg:w-72 group focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--accent-blue)]/20 transition-all border border-transparent focus-within:border-[var(--accent-blue)]/30">
              <Search size={18} className="text-[var(--text-light)]" />
              <input placeholder="Cari data..." className="bg-transparent border-none outline-none body2-orbit font-semibold w-full placeholder:text-[var(--text-light)] text-[var(--text-main)]" />
            </div>

            <Header />

            <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-gray-200 shadow-md flex items-center justify-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full accent-gradient flex items-center justify-center text-white text-sm font-bold">
                  {profile?.nama_lengkap?.charAt(0) || 'U'}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 md:p-8 lg:p-12 w-full overflow-y-auto">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </div>

        <nav className="lg:hidden fixed bottom-6 left-6 right-6 bg-white border border-gray-100 h-16 rounded-2xl flex justify-around items-center z-40 shadow-xl">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center p-2 rounded-xl ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                <Icon size={20} strokeWidth={2} />
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}