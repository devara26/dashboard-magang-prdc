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
    <div className="pb-12 animate-[fade-in_0.7s_ease-out] flex flex-col xl:flex-row gap-8">
      {showOnboarding && userId && (
        <OnboardingWizard 
          userId={userId ?? ''} 
          onComplete={() => {
            setShowOnboarding(false)
            fetchData()
          }} 
        />
      )}

      {/* Main Column: Course/Activity Style */}
      <div className="flex-1 space-y-8">
        <div>
          <h1 className="text-4xl font-black text-[#1d1d1f] tracking-tight">Dashboard Magang</h1>
          <p className="text-[#86868b] font-semibold mt-1 uppercase text-xs tracking-widest">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        <div className="bg-white rounded-[48px] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-50">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-2xl font-black text-[#1d1d1f]">Aktivitas Terakhir</h2>
            <div className="flex gap-2">
              <button className="p-2.5 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                <Plus className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {kegiatan.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#86868b] font-medium">Belum ada kegiatan yang dicatat.</p>
              </div>
            ) : (
              kegiatan.map((item, idx) => {
                const colors = ['bg-[#3b82f6]', 'bg-[#a855f7]', 'bg-[#eab308]', 'bg-[#ef4444]', 'bg-[#10b981]']
                const bgColor = colors[idx % colors.length]
                return (
                  <div key={item.id} className={`${bgColor} p-6 rounded-[32px] text-white flex items-center justify-between group hover:scale-[1.01] transition-all duration-300 cursor-pointer shadow-lg shadow-black/5`}>
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                        <Activity className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold truncate max-w-[200px] md:max-w-[400px]">{item.kegiatan}</h4>
                        <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">{item.status} • {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#1d1d1f]">
                        <span className="text-lg font-black">{new Date(item.tanggal).getDate()}</span>
                      </div>
                      <ChevronRight className="w-6 h-6 text-white/50 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <Link href="/dashboard/kegiatan" className="mt-8 flex items-center justify-center w-full py-5 border-2 border-dashed border-gray-100 rounded-[32px] text-[#86868b] font-bold hover:border-[#1a73e8] hover:text-[#1a73e8] transition-all">
            Lihat Semua Aktivitas
          </Link>
        </div>
      </div>

      {/* Right Column: Progress & Stats Style */}
      <div className="w-full xl:w-[400px] space-y-8">
        <div>
          <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100">
                 <span className="text-lg font-black text-[#1d1d1f]">{profile?.nama_lengkap?.charAt(0) || 'U'}</span>
               </div>
               <div>
                 <h3 className="font-bold text-[#1d1d1f]">{profile?.nama_lengkap || 'User'}</h3>
                 <p className="text-[#86868b] text-[10px] font-black uppercase tracking-widest">{profile?.nim || 'Mahasiswa'}</p>
               </div>
             </div>
          </div>
        </div>

        {/* Learning Progress Section */}
        <div className="bg-white rounded-[48px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-50">
          <h3 className="text-xl font-black text-[#1d1d1f] mb-8">My Progress</h3>
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#E8F0FE] rounded-2xl flex items-center justify-center text-[#1a73e8]">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-[#1d1d1f] text-sm">Kehadiran</p>
                  <p className="text-[#86868b] text-[10px] font-semibold">Hari ini</p>
                </div>
              </div>
              <div className="relative w-12 h-12">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path className="text-gray-100" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                  <path className="text-[#1a73e8]" strokeDasharray={`${progressPersen}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black">{progressPersen}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#FEF7E0] rounded-2xl flex items-center justify-center text-[#eab308]">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-[#1d1d1f] text-sm">Tugas Selesai</p>
                  <p className="text-[#86868b] text-[10px] font-semibold">{stats.tugasSelesai} dari {stats.totalKegiatan}</p>
                </div>
              </div>
              <div className="relative w-12 h-12">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path className="text-gray-100" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                  <path className="text-[#eab308]" strokeDasharray={`${stats.totalKegiatan > 0 ? (stats.tugasSelesai / stats.totalKegiatan) * 100 : 0}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black">{stats.totalKegiatan > 0 ? Math.round((stats.tugasSelesai / stats.totalKegiatan) * 100) : 0}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Streak Style Card */}
        <div className="bg-[#eab308] rounded-[48px] p-8 text-white relative overflow-hidden shadow-[0_20px_50px_rgba(234,179,8,0.2)]">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-4xl font-black">{stats.hadir}</h4>
              <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl">
                 <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-lg font-bold">Streak Days</p>
            <p className="text-white/70 text-xs font-semibold mt-1">Lanjutkan semangat magangmu!</p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute top-4 right-8 opacity-20">
             <Activity className="w-20 h-20" />
          </div>
        </div>

        {/* Planning Section Style */}
        <div className="bg-[#1d1d1f] rounded-[48px] p-8 text-white shadow-xl relative overflow-hidden">
           <div className="relative z-10">
             <h4 className="font-bold mb-4">Laporan Excel</h4>
             <p className="text-white/50 text-xs leading-relaxed mb-8">Download riwayat kegiatan untuk keperluan administrasi kampus.</p>
             <button 
               onClick={handleDownloadExcel}
               disabled={downloadingExcel}
               className="w-full py-4 bg-white text-[#1d1d1f] rounded-[24px] font-black text-sm flex items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50"
             >
               <Download className="w-4 h-4" />
               {downloadingExcel ? 'Menyiapkan...' : 'Download Report'}
             </button>
           </div>
           <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  )
}
