'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Users, CheckSquare, LogOut, User, Menu, LayoutGrid } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import NotificationBell from '@/components/NotificationBell'

export default function DosenLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [profileName, setProfileName] = useState('Dosen Orbit')
  const [role, setRole] = useState('Dosen')
  const [nip, setNip] = useState('---')
  const [initial, setInitial] = useState('D')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true)
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('nama_lengkap, role, avatar_url, nim')
          .eq('id', user.id)
          .maybeSingle()

        if (error) console.error('Dosen Layout Error:', error)

        if (data) {
          setProfileName(data.nama_lengkap || 'Dosen Orbit')
          setInitial((data.nama_lengkap || 'D').charAt(0).toUpperCase())
          setRole(data.role || 'Dosen')
          setAvatarUrl(data.avatar_url)
          setNip(data.nim || 'Dosen Tetap')
        }
      } catch (err) {
        console.error('Runtime FetchUser Error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  async function handleLogout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
      await supabase.auth.signOut()
      router.push('/login')
    }
  }

  const navItems = [
    { name: 'Dashboard', href: '/dosen', icon: LayoutGrid },
    { name: 'Monitoring Mahasiswa', href: '/dosen/mahasiswa', icon: Users },
    { name: 'Persetujuan Laporan', href: '/dosen/persetujuan-laporan', icon: CheckSquare },
    { name: 'Profil Saya', href: '/dosen/profil', icon: User },
  ]

  if (loading) {
    return (
      <div className="fixed inset-0 z-[999] bg-[#F0F2F5] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#0066FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full bg-[#F0F2F5] text-[#202124] overflow-hidden font-sans selection:bg-blue-100">

      {/* Sidebar Desktop - Lebar Tetap w-72 Karena Hamburger Dihapus */}
      <aside className="hidden md:flex flex-col bg-white border-r border-[#E0E4E9] shadow-[10px_0_30px_rgba(0,0,0,0.02)] relative z-30 w-72">
        {/* Brand Logo Section */}
        <div className="h-24 flex items-center px-7 mb-4">
          <div className="flex items-center gap-4 w-full">
            <div className="w-10 h-10 bg-[#0066FF] rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-200">
              <LayoutGrid size={22} className="text-white" />
            </div>
            <div className="overflow-hidden">
              <h2 className="text-xl font-black tracking-tighter text-[#202124] leading-none">ORBIT</h2>
              <p className="text-[10px] font-bold text-[#5F6368] uppercase tracking-[0.2em] mt-1">Dosen Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/dosen' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${active
                  ? 'bg-[#0066FF] text-white shadow-xl shadow-blue-200 translate-x-1'
                  : 'text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124]'
                  }`}
              >
                <item.icon size={20} className={`shrink-0 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="text-[14px] font-bold tracking-tight">
                  {item.name}
                </span>
                {active && (
                  <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full shadow-glow"></div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Profile Section (Bottom) - Ditambahkan Link ke Profil */}
        <div className="p-4 mt-auto border-t border-[#F0F2F5]">
          <div className="p-4 rounded-[24px] bg-[#F8F9FA] flex flex-col gap-4">
            <Link href="/dosen/profil" className="flex items-center gap-3 cursor-pointer group/avatar">
              <div className="w-11 h-11 rounded-full bg-white border-2 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center font-bold text-[#0066FF] group-hover/avatar:border-blue-500 transition-colors">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg tracking-tighter">{initial}</span>
                )}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-sm font-bold text-[#202124] truncate leading-tight group-hover/avatar:text-[#0066FF] transition-colors">{profileName}</p>
                <p className="text-[11px] font-semibold text-[#5F6368] truncate mt-0.5">{nip}</p>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-300 group bg-white hover:bg-red-50 text-[#5F6368] hover:text-red-600 border border border-[#F0F2F5] shadow-sm"
              title="Keluar"
            >
              <LogOut size={18} className="shrink-0 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest">Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header Desktop - Tombol Hamburger Menu dan Garis Pembatas Dihapus */}
        <header className="hidden md:flex h-20 items-center justify-between px-10 bg-transparent shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-[#202124] tracking-tight">
              {navItems.find(item => pathname === item.href || (item.href !== '/dosen' && pathname.startsWith(item.href)))?.name || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#E0E4E9] flex items-center justify-center text-[#5F6368] shadow-sm">
              <NotificationBell />
            </div>
            <div className="h-4 w-[1px] bg-[#E0E4E9]"></div>

            {/* PERBAIKAN: Seluruh block avatar nama di kanan dibungkus Link ke Profil Dosen */}
            <Link href="/dosen/profil" className="flex items-center gap-3 pl-2 cursor-pointer group/header">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-bold text-[#202124] leading-tight group-hover/header:text-[#0066FF] transition-colors">{profileName}</p>
                <p className="text-[10px] font-black text-[#0066FF] uppercase tracking-widest mt-0.5">{role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#0066FF] text-white flex items-center justify-center text-sm font-bold shadow-md border-2 border-white group-hover/header:scale-105 transition-transform">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
            </Link>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>

        {/* Mobile Sidebar Overlay/Header - Ditambahkan Link ke Profil di Sisi Kanan */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#F0F2F5] flex items-center justify-between px-6 z-50">
          <h2 className="text-lg font-black tracking-tighter text-[#0066FF]">ORBIT</h2>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Link href="/dosen/profil" className="w-8 h-8 rounded-full bg-[#0066FF] text-white flex items-center justify-center text-xs font-bold shadow-md cursor-pointer">
              {initial}
            </Link>
          </div>
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#F0F2F5] flex items-center justify-around z-50 px-2 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/dosen' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1.5 w-full transition-all duration-300 ${active ? 'text-[#0066FF]' : 'text-[#5F6368]'
                }`}
            >
              <div className={`p-2 rounded-xl transition-all duration-300 ${active ? 'bg-blue-50' : ''}`}>
                <item.icon size={20} className={active ? 'animate-pulse' : ''} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden transition-all'}`}>
                {item.name.split(' ')[0]}
              </span>
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-1.5 w-full text-[#5F6368]"
        >
          <div className="p-2 rounded-xl">
            <LogOut size={20} />
          </div>
        </button>
      </nav>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E0E4E9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D1D5DB;
        }
        .shadow-glow {
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
        }
      `}</style>
    </div>
  )
}