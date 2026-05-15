'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Clock, Activity, Calendar, TrendingUp, Plus, ChevronRight, List, Download } from 'lucide-react'
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
      if (userError || !user) throw new Error('Sesi pengguna tidak ditemukan. Silakan login kembali.')

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw new Error('Gagal mengambil data profil.')

      setUserId(user.id)
      setProfile(profileData)

      // Detection: If profile is incomplete (no NIM or Instansi), show onboarding
      if (!profileData?.nim || !profileData?.instansi_magang) {
        setShowOnboarding(true)
      }

      const { count: countHadir, error: absensiError } = await supabase
        .from('absensi')
        .select('*', { count: 'exact', head: true })
        .eq('mahasiswa_id', user.id)
        .eq('status', 'Hadir')

      if (absensiError) throw new Error('Gagal mengambil data absensi.')

      let kegiatanData: any[] = []
      let countSelesai = 0
      let countTotalKegiatan = 0

      if (profileData?.nim) {
        const [kegRes, selCount, totCount] = await Promise.all([
          supabase.from('kegiatan').select('*').eq('nim', profileData.nim).order('tanggal', { ascending: false }).limit(5),
          supabase.from('kegiatan').select('*', { count: 'exact', head: true }).eq('nim', profileData.nim).eq('status', 'Selesai'),
          supabase.from('kegiatan').select('*', { count: 'exact', head: true }).eq('nim', profileData.nim)
        ])
        
        // Fallback to uppercase if lowercase fails
        if (kegRes.error) {
          const [kegRes2, selCount2, totCount2] = await Promise.all([
            supabase.from('Kegiatan').select('*').eq('nim', profileData.nim).order('tanggal', { ascending: false }).limit(5),
            supabase.from('Kegiatan').select('*', { count: 'exact', head: true }).eq('nim', profileData.nim).eq('status', 'Selesai'),
            supabase.from('Kegiatan').select('*', { count: 'exact', head: true }).eq('nim', profileData.nim)
          ])
          
          if (!kegRes2.error) {
            kegiatanData = kegRes2.data || []
            countSelesai = selCount2.count || 0
            countTotalKegiatan = totCount2.count || 0
          } else {
            console.error('Fetch Kegiatan Error:', kegRes2.error)
            throw new Error('Gagal mengambil data kegiatan terbaru.')
          }
        } else {
          kegiatanData = kegRes.data || []
          countSelesai = selCount.count || 0
          countTotalKegiatan = totCount.count || 0
        }
      }

      setKegiatan(kegiatanData)
      setStats({
        hadir: countHadir || 0,
        tugasSelesai: countSelesai,
        totalKegiatan: countTotalKegiatan
      })

      // Run automated checks
      checkAndCreateNotifications(user.id, profileData?.nim, kegiatanData)
    } catch (error: any) {
      toast.error(error.message || 'Gagal memuat data dashboard. Pastikan koneksi internet stabil.')
      console.error('Dashboard Fetch Error:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleTambahClick() {
    router.push('/dashboard/kegiatan')
  }

  async function handleDownloadExcel() {
    try {
      setDownloadingExcel(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User tidak ditemukan')
      await exportLaporanExcel(user)
      toast.success('Laporan berhasil diunduh')
    } catch (error: any) {
      toast.error('Gagal mengunduh laporan: ' + error.message)
    } finally {
      setDownloadingExcel(false)
    }
  }

  async function checkAndCreateNotifications(userId: string, nim?: string, activities?: any[]) {
    try {
      // 1. Check for Missing Documents
      const { data: berkasData } = await supabase.from('berkas').select('document_type').eq('mahasiswa_id', userId)
      const uploadedTypes = berkasData?.map(b => b.document_type) || []
      const mandatoryDocs = ['CV', 'Surat Tugas']
      const missing = mandatoryDocs.filter(doc => !uploadedTypes.includes(doc))

      if (missing.length > 0) {
        // Check if notification already exists for today to avoid spam
        const today = new Date().toISOString().split('T')[0]
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .ilike('message', '%dokumen%')
          .gte('created_at', today)
          .limit(1)

        if (!existing || existing.length === 0) {
          await supabase.from('notifications').insert({
            user_id: userId,
            message: `Anda belum mengunggah dokumen: ${missing.join(', ')}. Harap segera lengkapi berkas Anda.`,
            type: 'warning',
            is_read: false
          })
        }
      }

      // 2. Check for Inactivity (3+ Days No Journal)
      if (activities && activities.length > 0) {
        const lastDate = new Date(activities[0].tanggal)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays >= 3) {
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .ilike('message', '%jurnal%')
            .limit(1)

          if (!existing || existing.length === 0) {
            await supabase.from('notifications').insert({
              user_id: userId,
              message: `Sudah ${diffDays} hari Anda tidak mengisi jurnal kegiatan. Jangan lupa untuk tetap update!`,
              type: 'error',
              is_read: false
            })
          }
        }
      }
    } catch (err) {
      console.error('Notification Trigger Error:', err)
    }
  }

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1A73E8] rounded-full animate-spin"></div>
        <p className="text-[#5F6368] text-sm font-medium animate-pulse">Memuat data dashboard...</p>
      </div>
    </div>
  )

  function getWorkDays(startDateStr: string, endDateStr: string): number {
    const start = new Date(startDateStr)
    const end = new Date(endDateStr)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 150
    
    let count = 0
    let current = new Date(start)
    while (current <= end) {
      const day = current.getDay()
      if (day !== 0 && day !== 6) {
        count++
      }
      current.setDate(current.getDate() + 1)
    }
    return count
  }

  const totalHariTarget = profile?.tanggal_mulai && profile?.tanggal_selesai 
    ? getWorkDays(profile.tanggal_mulai, profile.tanggal_selesai) 
    : 150
  
  const progressPersen = totalHariTarget > 0 ? Math.min(Math.round((stats.hadir / totalHariTarget) * 100), 100) : 0

  return (
    <div className="animate-fade-in flex flex-col xl:flex-row gap-10">
      {showOnboarding && userId && (
        <OnboardingWizard 
          userId={userId ?? ''} 
          onComplete={() => {
            setShowOnboarding(false)
            fetchData()
          }} 
        />
      )}

      {/* Left Column: Activity List (Google Style) */}
      <div className="flex-1 space-y-10">
        <header>
          <h1 className="text-[32px] leading-[40px] font-bold tracking-tight text-[var(--on-surface)]">Dashboard Magang</h1>
          <p className="text-[14px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest mt-1">
            {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </header>

        <section className="bg-[var(--surface-container-lowest)] rounded-[32px] p-8 md:p-10 border border-[var(--outline-variant)] shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-[20px] font-bold text-[var(--on-surface)]">Aktivitas Terakhir</h2>
            <button 
              onClick={handleTambahClick}
              className="w-10 h-10 rounded-full bg-[var(--primary-container)] text-[var(--on-primary-container)] flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>

          <div className="space-y-4">
            {kegiatan.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-[var(--surface-container-low)] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[48px] text-[var(--outline)]">event_busy</span>
                </div>
                <div>
                  <p className="text-[16px] font-medium text-[var(--on-surface-variant)]">Belum ada kegiatan yang dicatat.</p>
                  <p className="text-[12px] text-[var(--outline)] mt-1">Mulai catat jurnal harian Anda untuk melacak kemajuan magang.</p>
                </div>
              </div>
            ) : (
              kegiatan.map((item, idx) => {
                const colorVars = [
                  { bg: 'bg-[var(--primary)]', container: 'bg-[var(--primary-container)]', on: 'text-[var(--on-primary-container)]' },
                  { bg: 'bg-[var(--tertiary)]', container: 'bg-[var(--tertiary-container)]', on: 'text-[var(--on-tertiary-container)]' },
                  { bg: 'bg-[#006a6a]', container: 'bg-[#6ff7f6]', on: 'text-[#002020]' },
                  { bg: 'bg-[#984061]', container: 'bg-[#ffd9e2]', on: 'text-[#3e001d]' }
                ]
                const color = colorVars[idx % colorVars.length]
                return (
                  <div key={item.id} className={`${color.bg} p-6 rounded-[24px] text-white flex items-center justify-between group hover:scale-[1.01] transition-all duration-300 cursor-pointer shadow-sm`}>
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-[28px]">activity</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[16px] font-bold truncate max-w-[200px] md:max-w-[400px]">{item.kegiatan}</h4>
                        <p className="text-white/70 text-[12px] font-bold uppercase tracking-wider mt-0.5">{item.status} • {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[var(--on-surface)]">
                        <span className="text-[18px] font-black">{new Date(item.tanggal).getDate()}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="mt-10 pt-6 border-t border-[var(--outline-variant)]">
            <Link href="/dashboard/kegiatan" className="w-full py-4 border-2 border-dashed border-[var(--outline-variant)] text-[var(--on-surface-variant)] rounded-2xl font-bold hover:bg-[var(--surface-container-low)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all flex items-center justify-center gap-2">
              Lihat Semua Aktivitas
            </Link>
          </div>
        </section>
      </div>

      {/* Right Column: Progress (Google Style) */}
      <div className="w-full xl:w-[400px] space-y-10">
        <section className="bg-[var(--surface-container-lowest)] rounded-[32px] p-8 border border-[var(--outline-variant)] shadow-sm space-y-8">
          <h3 className="text-[20px] font-bold text-[var(--on-surface)]">My Progress</h3>
          <div className="space-y-6">
            {/* Attendance Item */}
            <div className="flex items-center justify-between p-4 bg-[var(--surface-container-low)] rounded-2xl border border-[var(--outline-variant)]/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary-container)] text-[var(--primary)] flex items-center justify-center">
                  <span className="material-symbols-outlined">calendar_today</span>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[var(--on-surface)]">Kehadiran</p>
                  <p className="text-[12px] text-[var(--on-surface-variant)]">Target: {totalHariTarget} Hari</p>
                </div>
              </div>
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle className="text-[var(--surface-container-high)]" cx="24" cy="24" fill="transparent" r="20" stroke="currentColor" strokeWidth="4"></circle>
                  <circle className="text-[var(--primary)]" cx="24" cy="24" fill="transparent" r="20" stroke="currentColor" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * progressPersen / 100)} strokeWidth="4" strokeLinecap="round"></circle>
                </svg>
                <span className="absolute text-[10px] font-black">{progressPersen}%</span>
              </div>
            </div>

            {/* Task Item */}
            <div className="flex items-center justify-between p-4 bg-[var(--surface-container-low)] rounded-2xl border border-[var(--outline-variant)]/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--tertiary-container)] text-[var(--tertiary)] flex items-center justify-center">
                  <span className="material-symbols-outlined">check_circle</span>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[var(--on-surface)]">Tugas Selesai</p>
                  <p className="text-[12px] text-[var(--on-surface-variant)]">{stats.tugasSelesai} Diverifikasi</p>
                </div>
              </div>
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle className="text-[var(--surface-container-high)]" cx="24" cy="24" fill="transparent" r="20" stroke="currentColor" strokeWidth="4"></circle>
                  <circle className="text-[var(--tertiary)]" cx="24" cy="24" fill="transparent" r="20" stroke="currentColor" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * (stats.totalKegiatan > 0 ? (stats.tugasSelesai / stats.totalKegiatan) * 100 : 0) / 100)} strokeWidth="4" strokeLinecap="round"></circle>
                </svg>
                <span className="absolute text-[10px] font-black">{stats.totalKegiatan > 0 ? Math.round((stats.tugasSelesai / stats.totalKegiatan) * 100) : 0}%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Streak Card */}
        <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-[32px] p-8 text-white shadow-lg relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 opacity-20 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-[120px]">bolt</span>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-[64px] font-extrabold leading-none">{stats.hadir}</span>
              <span className="material-symbols-outlined">show_chart</span>
            </div>
            <h4 className="text-[20px] font-bold mt-2">Streak Days</h4>
            <p className="text-[14px] opacity-90 mt-1 font-medium">Lanjutkan semangat magangmu!</p>
          </div>
        </div>

        {/* Excel Report Card */}
        <div className="bg-[var(--inverse-surface)] rounded-[32px] p-8 text-white shadow-xl hover:shadow-2xl transition-all border border-white/10 group cursor-pointer relative overflow-hidden" onClick={handleDownloadExcel}>
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-[var(--primary)] transition-colors">
                <span className="material-symbols-outlined">table_view</span>
              </div>
              <span className="material-symbols-outlined text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all">arrow_forward</span>
            </div>
            <h4 className="text-[20px] font-bold mb-2">Laporan Excel</h4>
            <p className="text-[14px] text-white/70 leading-relaxed font-medium">Unduh riwayat kegiatan untuk keperluan administrasi kampus secara praktis dan rapi.</p>
            <div className="mt-8 flex items-center gap-2 text-[var(--primary-fixed)] font-bold text-xs uppercase tracking-widest">
              <span className="material-symbols-outlined text-sm">download</span>
              <span>{downloadingExcel ? 'Menyiapkan...' : 'Unduh Sekarang'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
}
