'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Clock, Activity, Calendar, TrendingUp, Plus, ChevronRight, List } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('User tidak ditemukan')

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      
      const { count: countHadir } = await supabase.from('absensi').select('*', { count: 'exact', head: true }).eq('mahasiswa_id', user.id).eq('status', 'Hadir')

      let kegiatanData: any[] = []
      let countSelesai = 0
      let countTotalKegiatan = 0

      if (profileData?.nim) {
        const [kegRes, selCount, totCount] = await Promise.all([
          supabase.from('Kegiatan').select('*').eq('nim', profileData.nim).order('tanggal', { ascending: false }).limit(5),
          supabase.from('Kegiatan').select('*', { count: 'exact', head: true }).eq('nim', profileData.nim).eq('status', 'Selesai'),
          supabase.from('Kegiatan').select('*', { count: 'exact', head: true }).eq('nim', profileData.nim)
        ])
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
    } catch (error: any) {
      toast.error('Gagal memuat data dashboard')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  function handleTambahClick() {
    router.push('/dashboard/kegiatan')
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
    <div className="pb-12 animate-[fade-in_0.7s_ease-out]">
      
      {/* Header Section */}
      <div className="mb-10 relative flex flex-col items-center text-center md:items-start md:text-left">
        <h1 className="text-3xl font-medium tracking-tight text-[#202124] mb-2 relative z-10">
          Selamat datang, <span className="text-[#1A73E8] block sm:inline">{profile?.nama_lengkap || 'Mahasiswa'}</span>
        </h1>
        <p className="text-[#5F6368] text-base flex flex-col sm:flex-row items-center gap-2 relative z-10">
          <span className="bg-white px-3 py-1 rounded-full text-sm border border-gray-200 shadow-sm">{profile?.unit_magang || 'Divisi IT'}</span>
          <span className="hidden sm:inline">·</span>
          <span>{profile?.instansi_magang || 'PT Contoh Instansi'}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statCards.map(s => (
          <div key={s.label} className={`group bg-white border border-gray-200 rounded-xl p-6 transition-all duration-300 hover:shadow-md ${s.border} hover:-translate-y-1`}>
            <div className="flex justify-between items-start mb-4">
              <p className="text-[#5F6368] text-sm font-medium">{s.label}</p>
              <div className={`p-2 rounded-full ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
            <p className="text-[#202124] text-4xl font-normal mb-1 tracking-tight">{s.value}</p>
            <p className="text-[#5F6368] text-xs font-medium">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Progress Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 hover:shadow-sm transition-shadow">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-[#202124] text-lg font-medium flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#4285F4]" />
              Progress Kehadiran Magang
            </h2>
            <p className="text-[#5F6368] text-sm mt-1">Berdasarkan total target kehadiran {totalHariTarget} hari</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-normal text-[#1A73E8]">{progressPersen}%</p>
          </div>
        </div>
        <div className="w-full bg-[#F1F3F4] rounded-full h-2.5 overflow-hidden">
          <div className="bg-[#1A73E8] h-full rounded-full relative transition-all duration-1000 ease-out" style={{ width: `${progressPersen}%` }}></div>
        </div>
      </div>

      {/* Activities Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
        <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-[#202124] text-lg font-medium flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#34A853]" />
              Kegiatan Terbaru
            </h2>
            <p className="text-[#5F6368] text-sm mt-1">5 log kegiatan terakhir yang Anda laporkan</p>
          </div>
          <button
            onClick={handleTambahClick}
            className="flex items-center gap-2 bg-[#1A73E8] hover:bg-[#1967D2] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Tambah Log
          </button>
        </div>
        
        <div className="p-0 overflow-x-auto">
          {kegiatan.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-[#F8F9FA] rounded-full flex items-center justify-center mb-4 border border-gray-200">
                <List className="w-8 h-8 text-[#9AA0A6]" />
              </div>
              <p className="text-[#202124] font-medium text-lg">Belum ada kegiatan</p>
              <p className="text-[#5F6368] text-sm mt-1 max-w-sm">Anda belum menambahkan log kegiatan apa pun. Klik tombol tambah untuk mulai mencatat.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8F9FA] text-[#5F6368] text-xs font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-medium">Tanggal</th>
                  <th className="px-6 py-3 font-medium">Kegiatan</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {kegiatan.map((k) => (
                  <tr key={k.id} className="hover:bg-[#F8F9FA] transition-colors group">
                    <td className="px-6 py-4 text-[#5F6368] whitespace-nowrap font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#9AA0A6] group-hover:text-[#1A73E8] transition-colors" />
                      {k.tanggal}
                    </td>
                    <td className="px-6 py-4 text-[#202124]">
                      <span className="line-clamp-2">{k.kegiatan}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        k.status === 'Selesai' ? 'bg-[#E6F4EA] text-[#137333]' :
                        k.status === 'Proses' ? 'bg-[#FEF7E0] text-[#E37400]' :
                        'bg-[#F1F3F4] text-[#3C4043]'
                      }`}>
                        {k.status === 'Selesai' && <CheckCircle2 className="w-3 h-3" />}
                        {k.status === 'Proses' && <Activity className="w-3 h-3" />}
                        {k.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button onClick={() => router.push('/dashboard/kegiatan')} className="text-[#5F6368] hover:text-[#1A73E8] p-2 rounded-full hover:bg-[#E8F0FE] transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
    </div>
  )
}
