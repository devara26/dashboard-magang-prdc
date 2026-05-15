'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { exportLaporanExcel } from '@/lib/export-excel'
import OnboardingWizard from '@/components/OnboardingWizard'

type Profile = {
  nama_lengkap: string
  nim: string
  instansi_magang: string
  unit_magang: string
  tanggal_mulai?: string
  tanggal_selesai?: string
}

type Kegiatan = {
  id: number
  tanggal: string
  kegiatan: string
  status: string
}

type DashboardStats = {
  hadir: number
  tugasSelesai: number
  totalKegiatan: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([])
  const [stats, setStats] = useState<DashboardStats>({ hadir: 0, tugasSelesai: 0, totalKegiatan: 0 })
  const [loading, setLoading] = useState(true)
  const [downloadingExcel, setDownloadingExcel] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Sesi pengguna tidak ditemukan.')

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw new Error('Gagal mengambil data profil.')

      setUserId(user.id)
      setProfile(profileData)

      if (!profileData?.nim || !profileData?.instansi_magang) {
        setShowOnboarding(true)
      }

      const { count: countHadir } = await supabase
        .from('absensi')
        .select('*', { count: 'exact', head: true })
        .eq('mahasiswa_id', user.id)
        .eq('status', 'Hadir')

      let kegiatanData: any[] = []
      let countSelesai = 0
      let countTotalKegiatan = 0

      if (profileData?.nim) {
        let { data, error } = await supabase.from('Kegiatan').select('*').eq('nim', profileData.nim).order('tanggal', { ascending: false }).limit(5)
        
        if (error) {
          const { data: dataLow, error: errorLow } = await supabase.from('kegiatan').select('*').eq('nim', profileData.nim).order('tanggal', { ascending: false }).limit(5)
          if (!errorLow) data = dataLow
        }
        
        kegiatanData = data || []
        
        const [selCount, totCount] = await Promise.all([
          supabase.from('Kegiatan').select('*', { count: 'exact', head: true }).eq('nim', profileData.nim).eq('status', 'Selesai'),
          supabase.from('Kegiatan').select('*', { count: 'exact', head: true }).eq('nim', profileData.nim)
        ])

        countSelesai = selCount.count || 0
        countTotalKegiatan = totCount.count || 0
      }

      setKegiatan(kegiatanData)
      setStats({
        hadir: countHadir || 0,
        tugasSelesai: countSelesai,
        totalKegiatan: countTotalKegiatan
      })
    } catch (error: any) {
      toast.error(error.message)
      console.error('Dashboard Fetch Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadExcel() {
    try {
      setDownloadingExcel(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User tidak ditemukan')
      await exportLaporanExcel(user)
      toast.success('Laporan berhasil diunduh')
    } catch (error: any) {
      toast.error('Gagal mengunduh: ' + error.message)
    } finally {
      setDownloadingExcel(false)
    }
  }

  function getWorkDays(startDateStr: string, endDateStr: string): number {
    const start = new Date(startDateStr)
    const end = new Date(endDateStr)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 150
    let count = 0
    let current = new Date(start)
    while (current <= end) {
      const day = current.getDay()
      if (day !== 0 && day !== 6) count++
      current.setDate(current.getDate() + 1)
    }
    return count
  }

  const totalHariTarget = profile?.tanggal_mulai && profile?.tanggal_selesai 
    ? getWorkDays(profile.tanggal_mulai, profile.tanggal_selesai) 
    : 150
  const progressPersen = totalHariTarget > 0 ? Math.min(Math.round((stats.hadir / totalHariTarget) * 100), 100) : 0

  if (loading) return null

  return (
    <div className="animate-fade-in flex flex-col xl:flex-row gap-10 lg:gap-16">
      {showOnboarding && userId && (
        <OnboardingWizard userId={userId ?? ''} onComplete={() => { setShowOnboarding(false); fetchData(); }} />
      )}

      {/* Main Stream Column */}
      <div className="flex-1 space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-[36px] font-black text-[var(--on-surface)] tracking-tight leading-tight">Beranda Magang</h1>
            <p className="text-[14px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest mt-1">
               {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button 
            onClick={() => router.push('/dashboard/kegiatan')}
            className="flex items-center justify-center gap-3 bg-[var(--primary)] text-white px-8 py-4 rounded-[24px] font-black text-sm shadow-xl shadow-blue-100 hover:scale-[1.02] transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">add</span>
            Mulai Mencatat
          </button>
        </header>

        {/* Activity Stream Section */}
        <section className="bg-[var(--surface-container-lowest)] rounded-[40px] p-10 border border-[var(--outline-variant)] shadow-sm">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-6 bg-[var(--primary)] rounded-full"></div>
               <h2 className="text-[22px] font-black text-[var(--on-surface)]">Aktivitas Terakhir</h2>
            </div>
            <Link href="/dashboard/kegiatan" className="text-[12px] font-black text-[var(--primary)] hover:underline uppercase tracking-wider">
              Lihat Semua
            </Link>
          </div>

          <div className="space-y-6">
            {kegiatan.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-24 h-24 rounded-full bg-[var(--surface-container-low)] flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-[56px] text-[var(--outline-variant)]">pending_actions</span>
                </div>
                <p className="text-[18px] font-black text-[var(--on-surface)]">Jurnal masih kosong</p>
                <p className="text-[14px] font-medium text-[var(--on-surface-variant)] mt-2">Segera isi laporan harianmu untuk divalidasi pembimbing.</p>
              </div>
            ) : (
              kegiatan.map((item, idx) => {
                const colors = [
                  { bg: 'bg-[var(--primary)]', container: 'bg-[var(--primary-container)]' },
                  { bg: 'bg-[var(--tertiary)]', container: 'bg-[var(--tertiary-container)]' },
                  { bg: 'bg-[#1e8e3e]', container: 'bg-[#e6f4ea]' },
                  { bg: 'bg-[#d93025]', container: 'bg-[#fce8e6]' }
                ]
                const color = colors[idx % colors.length]
                return (
                  <div key={item.id} className="group flex items-center justify-between p-6 rounded-[32px] bg-[var(--surface-container-low)] border border-[var(--outline-variant)]/30 hover:border-[var(--primary)] transition-all cursor-pointer">
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 ${color.bg} rounded-2xl flex flex-col items-center justify-center text-white shadow-lg`}>
                        <span className="text-[10px] font-black uppercase opacity-70">{new Date(item.tanggal).toLocaleDateString('id-ID', { month: 'short' })}</span>
                        <span className="text-[24px] font-black leading-none">{new Date(item.tanggal).getDate()}</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[16px] font-black text-[var(--on-surface)] truncate group-hover:text-[var(--primary)] transition-colors pr-4">{item.kegiatan}</h4>
                        <div className="flex items-center gap-3 mt-1.5">
                           <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${item.status === 'Selesai' ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fef7e0] text-[#e37400]'}`}>
                             {item.status}
                           </span>
                           <span className="text-[11px] font-bold text-[var(--on-surface-variant)]">{new Date(item.tanggal).toLocaleDateString('id-ID', { weekday: 'long' })}</span>
                        </div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[var(--outline-variant)] group-hover:text-[var(--primary)] transition-all group-hover:translate-x-1">chevron_right</span>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      {/* Progress & Cluster Column */}
      <div className="w-full xl:w-[420px] space-y-10">
        {/* Progress Card */}
        <section className="bg-[var(--surface-container-lowest)] rounded-[40px] p-10 border border-[var(--outline-variant)] shadow-sm">
           <h3 className="text-[20px] font-black text-[var(--on-surface)] mb-10 flex items-center gap-3">
              <span className="material-symbols-outlined text-[var(--primary)]">analytics</span>
              Progres Magang
           </h3>
           
           <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col items-center gap-4">
                 <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle className="text-[var(--surface-container-high)]" cx="56" cy="56" fill="transparent" r="48" stroke="currentColor" strokeWidth="8"></circle>
                      <circle className="text-[var(--primary)]" cx="56" cy="56" fill="transparent" r="48" stroke="currentColor" strokeDasharray="301.6" strokeDashoffset={301.6 - (301.6 * progressPersen / 100)} strokeWidth="8" strokeLinecap="round"></circle>
                    </svg>
                    <div className="absolute flex flex-col items-center">
                       <span className="text-[24px] font-black text-[var(--on-surface)] leading-none">{progressPersen}%</span>
                    </div>
                 </div>
                 <div className="text-center">
                    <p className="text-[12px] font-black text-[var(--on-surface)] uppercase tracking-tighter">Kehadiran</p>
                    <p className="text-[10px] font-bold text-[var(--on-surface-variant)]">{stats.hadir} / {totalHariTarget} Hari</p>
                 </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                 <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle className="text-[var(--surface-container-high)]" cx="56" cy="56" fill="transparent" r="48" stroke="currentColor" strokeWidth="8"></circle>
                      <circle className="text-[var(--tertiary)]" cx="56" cy="56" fill="transparent" r="48" stroke="currentColor" strokeDasharray="301.6" strokeDashoffset={301.6 - (301.6 * (stats.totalKegiatan > 0 ? (stats.tugasSelesai / stats.totalKegiatan) * 100 : 0) / 100)} strokeWidth="8" strokeLinecap="round"></circle>
                    </svg>
                    <div className="absolute flex flex-col items-center">
                       <span className="text-[24px] font-black text-[var(--on-surface)] leading-none">{stats.totalKegiatan > 0 ? Math.round((stats.tugasSelesai / stats.totalKegiatan) * 100) : 0}%</span>
                    </div>
                 </div>
                 <div className="text-center">
                    <p className="text-[12px] font-black text-[var(--on-surface)] uppercase tracking-tighter">Verifikasi</p>
                    <p className="text-[10px] font-bold text-[var(--on-surface-variant)]">{stats.tugasSelesai} Log Selesai</p>
                 </div>
              </div>
           </div>
        </section>

        {/* Streak & Motivation Card */}
        <section className="bg-gradient-to-br from-[#1a73e8] to-[#004ac6] rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-200 group">
           <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:rotate-12 transition-transform duration-700">
              <span className="material-symbols-outlined text-[200px]">auto_awesome</span>
           </div>
           <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                 <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-[32px]">bolt</span>
                 </div>
                 <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">Keep it up!</span>
              </div>
              <div>
                 <h4 className="text-[56px] font-black leading-none mb-2">{stats.hadir}</h4>
                 <p className="text-[18px] font-black tracking-tight">Hari Beruntun</p>
                 <p className="text-[12px] opacity-70 font-medium mt-1 leading-relaxed">Jangan biarkan harimu kosong tanpa progres. Kamu melakukannya dengan hebat!</p>
              </div>
           </div>
        </section>

        {/* Report Card */}
        <section className="bg-[var(--inverse-surface)] rounded-[40px] p-10 text-white shadow-xl relative overflow-hidden group cursor-pointer" onClick={handleDownloadExcel}>
           <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                 <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-[var(--primary)] transition-all duration-300">
                    <span className="material-symbols-outlined">description</span>
                 </div>
                 <span className="material-symbols-outlined opacity-40 group-hover:opacity-100 group-hover:translate-x-2 transition-all">arrow_forward_ios</span>
              </div>
              <h4 className="text-[20px] font-black mb-2">Laporan Magang</h4>
              <p className="text-[13px] text-white/60 leading-relaxed font-medium">Export seluruh aktivitasmu ke format Excel dalam hitungan detik.</p>
              <div className="mt-10 flex items-center gap-3 text-[var(--primary-fixed-dim)]">
                 <div className={`flex items-center gap-2 ${downloadingExcel ? 'animate-pulse' : ''}`}>
                    <span className="material-symbols-outlined text-sm">download</span>
                    <span className="text-[11px] font-black uppercase tracking-widest">{downloadingExcel ? 'Sabar Ya...' : 'Download Sekarang'}</span>
                 </div>
              </div>
           </div>
           <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px]" />
        </section>
      </div>
    </div>
  )
}
