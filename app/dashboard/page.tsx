'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Clock, Activity, Calendar, TrendingUp, Plus, ChevronRight, List, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { exportLaporanExcel } from '@/lib/export-excel'

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
          supabase.from('Kegiatan').select('*').eq('nim', profileData.nim).order('tanggal', { ascending: false }).limit(5),
          supabase.from('Kegiatan').select('*', { count: 'exact', head: true }).eq('nim', profileData.nim).eq('status', 'Selesai'),
          supabase.from('Kegiatan').select('*', { count: 'exact', head: true }).eq('nim', profileData.nim)
        ])
        
        if (kegRes.error) throw new Error('Gagal mengambil data kegiatan terbaru.')
        if (selCount.error) throw new Error('Gagal mengambil ringkasan tugas selesai.')
        if (totCount.error) throw new Error('Gagal mengambil total kegiatan.')

        kegiatanData = kegRes.data || []
        countSelesai = selCount.count || 0
        countTotalKegiatan = totCount.count || 0
      }

      setProfile(profileData)
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
        const today = new Error().toISOString().split('T')[0]
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
            // Note: For inactivity, we might only notify once until they fill it

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

  const statCards = [
    { label: 'Target Hari Magang', value: String(totalHariTarget), sub: 'hari kerja efektif', icon: Calendar, color: 'text-[#4285F4]', bg: 'bg-[#E8F0FE]', border: 'group-hover:border-[#4285F4]' },
    { label: 'Total Kehadiran', value: String(stats.hadir), sub: `${progressPersen}% dari target`, icon: CheckCircle2, color: 'text-[#34A853]', bg: 'bg-[#E6F4EA]', border: 'group-hover:border-[#34A853]' },
    { label: 'Tugas Selesai', value: String(stats.tugasSelesai), sub: 'kegiatan telah selesai', icon: Activity, color: 'text-[#FBBC04]', bg: 'bg-[#FEF7E0]', border: 'group-hover:border-[#FBBC04]' },
    { label: 'Total Kegiatan', value: String(stats.totalKegiatan), sub: 'tercatat di sistem', icon: TrendingUp, color: 'text-[#EA4335]', bg: 'bg-[#FCE8E6]', border: 'group-hover:border-[#EA4335]' },
  ]

  return (
    <div className="pb-8 animate-[fade-in_0.7s_ease-out] max-w-lg mx-auto md:max-w-none">
      
      {/* Header Section */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#FBBC04] flex-shrink-0 flex items-center justify-center shadow-sm border-2 border-white">
            <span className="text-xl font-medium text-white">{profile?.nama_lengkap?.charAt(0).toUpperCase() || 'U'}</span>
          </div>
          <div>
            <p className="text-[#5F6368] text-xs font-medium uppercase tracking-wider mb-0.5">Selamat datang!</p>
            <h1 className="text-lg font-bold text-[#202124] leading-tight line-clamp-1">{profile?.nama_lengkap || 'Mahasiswa'}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleDownloadExcel} 
            disabled={downloadingExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#E8F0FE] text-[#1A73E8] rounded-full text-xs font-bold transition-colors hover:bg-[#D2E3FC] disabled:opacity-50"
            title="Download Laporan Excel"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">{downloadingExcel ? 'Mengunduh...' : 'Laporan'}</span>
          </button>
          <button onClick={handleTambahClick} className="p-2 bg-white rounded-full border border-gray-100 shadow-sm text-[#5F6368] hover:text-[#1A73E8]">
            <Calendar className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Featured Bento Card (Progress) */}
      <div className="bg-[#E6F4EA] rounded-[28px] p-6 mb-4 shadow-sm relative overflow-hidden">
        {/* Dekorasi Background */}
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/30 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex justify-between items-center gap-4">
          <div className="flex-1">
            <p className="text-[#137333] text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5"/> Progress
            </p>
            <h2 className="text-[#0D652D] text-2xl font-bold mb-1 leading-tight">Kehadiran<br/>Mingguan</h2>
            <p className="text-[#137333] text-xs font-medium">{stats.hadir} dari {totalHariTarget} hari kerja</p>
          </div>
          <div className="w-[84px] h-[84px] bg-white rounded-full flex items-center justify-center shadow-sm border-[6px] border-[#CEEAD6] flex-shrink-0 relative">
            {/* Indikator Melingkar Semu */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-[#34A853]"
                strokeDasharray={`${progressPersen}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="currentColor" strokeWidth="3"
              />
            </svg>
            <span className="text-xl font-extrabold text-[#137333] z-10">{progressPersen}%</span>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-50 flex flex-col justify-between aspect-square">
          <div className="flex justify-between items-start">
            <p className="text-[#5F6368] text-xs font-bold w-1/2 leading-tight">Langkah<br/>Tugas</p>
            <div className="p-2 bg-[#FEF7E0] rounded-full text-[#FBBC04]"><CheckCircle2 className="w-4 h-4"/></div>
          </div>
          <div>
            <p className="text-[#202124] text-3xl font-extrabold tracking-tight">{stats.tugasSelesai}</p>
            <p className="text-[#5F6368] text-[10px] font-medium uppercase mt-0.5">Diselesaikan</p>
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-50 flex flex-col justify-between aspect-square">
          <div className="flex justify-between items-start">
            <p className="text-[#5F6368] text-xs font-bold w-1/2 leading-tight">Total<br/>Log</p>
            <div className="p-2 bg-[#E8F0FE] rounded-full text-[#1A73E8]"><List className="w-4 h-4"/></div>
          </div>
          <div>
            <p className="text-[#202124] text-3xl font-extrabold tracking-tight">{stats.totalKegiatan}</p>
            <p className="text-[#5F6368] text-[10px] font-medium uppercase mt-0.5">Kegiatan</p>
          </div>
        </div>
      </div>

      {/* Activities List */}
      <div className="bg-white rounded-[28px] shadow-sm border border-gray-50 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-[#202124] text-sm font-extrabold">Kegiatan Terbaru</h2>
            <p className="text-xs text-[#5F6368] mt-0.5">5 aktivitas terakhir</p>
          </div>
          <button onClick={handleTambahClick} className="w-8 h-8 flex items-center justify-center bg-[#F8F9FA] rounded-full text-[#1A73E8] hover:bg-[#E8F0FE] transition-colors border border-gray-100">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {kegiatan.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
              <Activity className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-[#5F6368] text-sm font-medium">Belum ada kegiatan</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {kegiatan.map((k) => (
              <div key={k.id} onClick={() => router.push('/dashboard/kegiatan')} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${k.status === 'Selesai' ? 'bg-[#E6F4EA] text-[#137333]' : 'bg-[#FEF7E0] text-[#E37400]'}`}>
                    {k.status === 'Selesai' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#202124] line-clamp-1">{k.kegiatan}</p>
                    <p className="text-[11px] font-medium text-[#9AA0A6] flex items-center gap-1 mt-0.5">
                      {k.tanggal} • {k.status}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1A73E8] transition-colors" />
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  )
}
