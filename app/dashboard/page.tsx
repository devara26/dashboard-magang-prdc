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
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-cyan-500 rounded-full animate-spin"></div>
        <p className="text-zinc-500 text-sm font-medium animate-pulse">Memuat data dashboard...</p>
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
    { label: 'Target Hari Magang', value: String(totalHariTarget), sub: 'hari kerja efektif', icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'group-hover:border-blue-500/50' },
    { label: 'Total Kehadiran', value: String(stats.hadir), sub: `${progressPersen}% dari target`, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'group-hover:border-emerald-500/50' },
    { label: 'Tugas Selesai', value: String(stats.tugasSelesai), sub: 'kegiatan telah selesai', icon: Activity, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'group-hover:border-purple-500/50' },
    { label: 'Total Kegiatan', value: String(stats.totalKegiatan), sub: 'tercatat di sistem', icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'group-hover:border-cyan-500/50' },
  ]

  return (
    <div className="pb-12 animate-[fade-in_0.7s_ease-out]">
      
      {/* Header Section */}
      <div className="mb-10 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none" />
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2 relative z-10">
          Selamat datang, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">{profile?.nama_lengkap || 'Mahasiswa'}</span> 👋
        </h1>
        <p className="text-zinc-400 text-base flex items-center gap-2 relative z-10">
          <span className="bg-zinc-900 px-3 py-1 rounded-full text-sm border border-zinc-800">{profile?.unit_magang || 'Divisi IT'}</span>
          <span>·</span>
          <span>{profile?.instansi_magang || 'PT Contoh Instansi'}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statCards.map(s => (
          <div key={s.label} className={`group bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6 transition-all duration-300 hover:bg-zinc-900 ${s.border} hover:shadow-lg hover:-translate-y-1`}>
            <div className="flex justify-between items-start mb-4">
              <p className="text-zinc-400 text-sm font-medium">{s.label}</p>
              <div className={`p-2 rounded-xl ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
            <p className="text-white text-4xl font-bold mb-1 tracking-tight">{s.value}</p>
            <p className="text-zinc-500 text-xs font-medium">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Progress Section */}
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6 mb-8 hover:border-zinc-700/50 transition-colors">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-white text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Progress Kehadiran Magang
            </h2>
            <p className="text-zinc-500 text-sm mt-1">Berdasarkan total target kehadiran {totalHariTarget} hari</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">{progressPersen}%</p>
          </div>
        </div>
        <div className="w-full bg-zinc-950 rounded-full h-3 border border-zinc-800 p-0.5 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-300 h-full rounded-full relative transition-all duration-1000 ease-out" style={{ width: `${progressPersen}%` }}>
            {/* Shimmer effect inside progress bar */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
          </div>
        </div>
      </div>

      {/* Activities Table */}
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl overflow-hidden hover:border-zinc-700/50 transition-colors">
        <div className="p-6 border-b border-zinc-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-white text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Kegiatan Terbaru
            </h2>
            <p className="text-zinc-500 text-sm mt-1">5 log kegiatan terakhir yang Anda laporkan</p>
          </div>
          <button
            onClick={handleTambahClick}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-cyan-500/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Tambah Log
          </button>
        </div>
        
        <div className="p-0 overflow-x-auto">
          {kegiatan.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4 border border-zinc-700/50">
                <List className="w-8 h-8 text-zinc-500" />
              </div>
              <p className="text-zinc-300 font-medium text-lg">Belum ada kegiatan</p>
              <p className="text-zinc-500 text-sm mt-1 max-w-sm">Anda belum menambahkan log kegiatan apa pun. Klik tombol tambah untuk mulai mencatat.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Tanggal</th>
                  <th className="px-6 py-4 font-medium">Kegiatan</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {kegiatan.map((k) => (
                  <tr key={k.id} className="hover:bg-zinc-800/20 transition-colors group">
                    <td className="px-6 py-4 text-zinc-400 whitespace-nowrap font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-600 group-hover:text-cyan-500/50 transition-colors" />
                      {k.tanggal}
                    </td>
                    <td className="px-6 py-4 text-zinc-200">
                      <span className="line-clamp-2">{k.kegiatan}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                        k.status === 'Selesai' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        k.status === 'Proses' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                        'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>
                        {k.status === 'Selesai' && <CheckCircle2 className="w-3 h-3" />}
                        {k.status === 'Proses' && <Activity className="w-3 h-3" />}
                        {k.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button onClick={() => router.push('/dashboard/kegiatan')} className="text-zinc-500 hover:text-cyan-400 p-2 rounded-lg hover:bg-cyan-400/10 transition-colors">
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