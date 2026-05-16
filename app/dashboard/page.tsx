'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  Bell, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Plus, 
  ChevronRight,
  TrendingUp,
  MapPin,
  Clock,
  User
} from 'lucide-react'

const DOCUMENT_TYPES_COUNT = 5 // Based on berkas page

export default function DashboardPage() {
   const router = useRouter()
   const [profile, setProfile] = useState<any>(null)
   const [kegiatan, setKegiatan] = useState<any[]>([])
   const [stats, setStats] = useState({ 
      hadir: 0, 
      tugasSelesai: 0, 
      totalKegiatan: 0,
      totalBerkas: 0
   })
   const [monthlyAttendance, setMonthlyAttendance] = useState<number[]>(Array(12).fill(0))
   const [loading, setLoading] = useState(true)
   const [userId, setUserId] = useState<string | null>(null)

   useEffect(() => {
      fetchData()
   }, [])

   async function fetchData() {
      try {
         const { data: { user } } = await supabase.auth.getUser()
         if (!user) return
         setUserId(user.id)

         const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
         setProfile(profileData)

         // Fetch attendance counts and distribution
         const { data: absensiData } = await supabase
            .from('absensi')
            .select('tanggal')
            .eq('mahasiswa_id', user.id)
            .eq('status', 'Hadir')

         const hadirCount = absensiData?.length || 0
         const distribution = Array(12).fill(0)
         absensiData?.forEach(row => {
            const month = new Date(row.tanggal).getMonth()
            distribution[month]++
         })
         setMonthlyAttendance(distribution)

         // Fetch journal stats
         let kegiatanData: any[] = []
         let countSelesai = 0
         let countTotal = 0

         if (profileData?.nim) {
            const { data, error } = await supabase.from('Kegiatan').select('*').eq('nim', profileData.nim).order('tanggal', { ascending: false }).limit(3)
            kegiatanData = data || []

            const [selCount, totCount] = await Promise.all([
               supabase.from('Kegiatan').select('*', { count: 'exact', head: true }).eq('nim', profileData.nim).eq('status_persetujuan', 'Disetujui'),
               supabase.from('Kegiatan').select('*', { count: 'exact', head: true }).eq('nim', profileData.nim)
            ])
            countSelesai = selCount.count || 0
            countTotal = totCount.count || 0
         }

         // Fetch berkas stats
         const { count: berkasCount } = await supabase
            .from('berkas')
            .select('*', { count: 'exact', head: true })
            .eq('mahasiswa_id', user.id)

         setKegiatan(kegiatanData)
         setStats({ 
            hadir: hadirCount, 
            tugasSelesai: countSelesai, 
            totalKegiatan: countTotal,
            totalBerkas: berkasCount || 0
         })
      } catch (error) {
         console.error(error)
      } finally {
         setLoading(false)
      }
   }

   const totalHariTarget = 150
   const progressPersen = Math.min(Math.round((stats.hadir / totalHariTarget) * 100), 100)
   const currentMonth = new Date().getMonth()

   if (loading) return null

   return (
      <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
         {/* Header Area */}
         <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-6">
               <div className="w-20 h-20 rounded-full accent-gradient flex items-center justify-center text-white text-3xl font-bold shadow-xl border-4 border-white">
                  {profile?.nama_lengkap?.charAt(0) || 'U'}
               </div>
               <div>
                  <h1 className="h1-orbit text-[var(--text-main)]">Halo, {profile?.nama_lengkap?.split(' ')[0]}</h1>
                  <p className="subtitle-orbit text-[var(--text-muted)] mt-1">Selamat datang kembali di platform monitoring ORBIT.</p>
               </div>
            </div>
            <button className="neumorphic-button relative w-14 h-14 flex items-center justify-center text-[var(--text-main)]">
               <Bell size={24} />
               <span className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
         </div>

         {/* Stats Row */}
         <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            <div className="neumorphic-card p-8 flex flex-col items-center text-center">
               <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[var(--accent-blue)] mb-6">
                  <Calendar size={28} />
               </div>
               <p className="label-orbit text-[var(--text-muted)] mb-1">Kehadiran</p>
               <h3 className="h3-orbit text-[var(--text-main)]">{stats.hadir} Hari</h3>
               <p className="caption-orbit text-[var(--text-light)] mt-2">Target: {totalHariTarget} Hari</p>
            </div>

            <div className="neumorphic-card p-8 flex flex-col items-center text-center">
               <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 mb-6">
                  <CheckCircle2 size={28} />
               </div>
               <p className="label-orbit text-[var(--text-muted)] mb-1">Jurnal</p>
               <h3 className="h3-orbit text-[var(--text-main)]">{stats.tugasSelesai} Log</h3>
               <p className="caption-orbit text-[var(--text-light)] mt-2">{Math.round((stats.tugasSelesai / Math.max(1, stats.totalKegiatan)) * 100)}% Disetujui</p>
            </div>

            <div className="neumorphic-card p-8 flex flex-col items-center text-center col-span-2 md:col-span-1">
               <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6">
                  <FileText size={28} />
               </div>
               <p className="label-orbit text-[var(--text-muted)] mb-1">Berkas</p>
               <h3 className="h3-orbit text-[var(--text-main)]">{stats.totalBerkas} Dokumen</h3>
               <p className="caption-orbit text-[var(--text-light)] mt-2">{stats.totalBerkas}/{DOCUMENT_TYPES_COUNT} Selesai</p>
            </div>
         </div>

         {/* Progress Section */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Circular Progress */}
            <div className="neumorphic-card p-10 flex flex-col items-center">
               <h4 className="h4-orbit text-[var(--text-main)] mb-10">Progres Magang</h4>
               <div className="relative w-64 h-64 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                     <circle className="text-gray-100" cx="128" cy="128" r="110" fill="transparent" stroke="currentColor" strokeWidth="24" />
                     <circle 
                        className="text-[var(--accent-blue)]" 
                        cx="128" cy="128" r="110" 
                        fill="transparent" 
                        stroke="currentColor" 
                        strokeWidth="24" 
                        strokeDasharray="691.15" 
                        strokeDashoffset={691.15 - (691.15 * progressPersen / 100)} 
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 2s ease-in-out' }}
                     />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                     <span className="h1-orbit text-[var(--text-main)] leading-none">{progressPersen}%</span>
                     <span className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest mt-2">Selesai</span>
                  </div>
               </div>
               <div className="mt-10 grid grid-cols-2 gap-10 w-full">
                  <div className="text-center">
                     <p className="h5-orbit text-[var(--text-main)]">{stats.hadir}</p>
                     <p className="caption-orbit text-[var(--text-light)]">Hadir</p>
                  </div>
                  <div className="text-center">
                     <p className="h5-orbit text-[var(--text-main)]">{totalHariTarget}</p>
                     <p className="caption-orbit text-[var(--text-light)]">Target</p>
                  </div>
               </div>
            </div>

            {/* Vertical Bar Chart */}
            <div className="neumorphic-card p-10 flex flex-col">
               <div className="flex justify-between items-center mb-10">
                  <h4 className="h4-orbit text-[var(--text-main)]">Kehadiran Bulanan</h4>
                  <div className="px-4 py-2 bg-gray-50 rounded-full flex items-center gap-2">
                     <TrendingUp size={16} className="text-[var(--accent-blue)]" />
                     <span className="caption-orbit font-bold">2026</span>
                  </div>
               </div>
               <div className="flex-1 flex items-end justify-between h-[300px] px-2 gap-4">
                  {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((label, i) => {
                     const val = monthlyAttendance[i]
                     const maxVal = Math.max(...monthlyAttendance, 1)
                     const height = (val / maxVal) * 100
                     return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-4">
                           <div className="w-full bg-gray-100 rounded-full h-[240px] flex flex-col justify-end overflow-hidden p-1.5">
                              <div 
                                 className={`w-full rounded-full transition-all duration-1000 ease-out ${i === currentMonth ? 'accent-gradient' : 'bg-gray-200'}`}
                                 style={{ height: `${Math.max(10, height)}%` }}
                              />
                           </div>
                           <span className={`caption-orbit font-bold ${i === currentMonth ? 'text-[var(--accent-blue)]' : 'text-[var(--text-light)]'}`}>{label}</span>
                        </div>
                     )
                  })}
               </div>
               <p className="caption-orbit text-[var(--text-muted)] text-center mt-8 italic">Data kehadiran diambil dari rekap harian yang telah diverifikasi.</p>
            </div>
         </div>

         {/* Recent Activity & Quick Actions */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Journal List */}
            <div className="lg:col-span-2 space-y-6">
               <div className="flex items-center justify-between px-4">
                  <h4 className="h4-orbit text-[var(--text-main)]">Jurnal Terbaru</h4>
                  <button onClick={() => router.push('/dashboard/kegiatan')} className="flex items-center gap-2 text-[var(--accent-blue)] font-bold caption-orbit hover:underline">
                     Lihat Semua <ChevronRight size={16} />
                  </button>
               </div>
               <div className="space-y-4">
                  {kegiatan.length > 0 ? kegiatan.map((item, idx) => (
                     <div key={idx} className="neumorphic-card p-6 flex items-center justify-between group hover:scale-[1.01] transition-transform">
                        <div className="flex items-center gap-6">
                           <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[var(--accent-blue)]">
                              <FileText size={24} />
                           </div>
                           <div>
                              <p className="body2-orbit font-bold text-[var(--text-main)] truncate max-w-[200px] md:max-w-md">{item.kegiatan}</p>
                              <div className="flex items-center gap-4 mt-1">
                                 <span className="caption-orbit text-[var(--text-light)] flex items-center gap-1.5">
                                    <Clock size={12} /> {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                 </span>
                                 <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                    {item.status}
                                 </span>
                              </div>
                           </div>
                        </div>
                        <button className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--text-light)] hover:text-[var(--accent-blue)] hover:bg-white shadow-sm border border-transparent hover:border-gray-200 transition-all">
                           <ChevronRight size={20} />
                        </button>
                     </div>
                  )) : (
                     <div className="neumorphic-card p-12 text-center text-[var(--text-light)] body2-orbit">
                        Belum ada log kegiatan jurnal.
                     </div>
                  )}
               </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
               <h4 className="h4-orbit text-[var(--text-main)] px-4">Aksi Cepat</h4>
               <div className="space-y-4">
                  <button 
                     onClick={() => router.push('/dashboard/absensi')}
                     className="neumorphic-button w-full flex items-center justify-center gap-4 accent-gradient text-white !shadow-none py-5"
                  >
                     <Plus size={20} />
                     <span className="label-orbit font-bold">Absen Hari Ini</span>
                  </button>
                  <button 
                     onClick={() => router.push('/dashboard/kegiatan')}
                     className="neumorphic-button w-full flex items-center justify-center gap-4 bg-white text-[var(--text-main)] py-5"
                  >
                     <FileText size={20} className="text-[var(--accent-blue)]" />
                     <span className="label-orbit font-bold">Tulis Jurnal</span>
                  </button>
                  <button 
                     onClick={() => router.push('/dashboard/berkas')}
                     className="neumorphic-button w-full flex items-center justify-center gap-4 bg-white text-[var(--text-main)] py-5"
                  >
                     <CheckCircle2 size={20} className="text-emerald-600" />
                     <span className="label-orbit font-bold">Upload Berkas</span>
                  </button>
               </div>

               {/* Location Card */}
               <div className="neumorphic-card p-6 accent-gradient text-white mt-10">
                  <div className="flex items-center gap-4 mb-4">
                     <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                        <MapPin size={20} />
                     </div>
                     <p className="label-orbit font-bold">Lokasi Magang</p>
                  </div>
                  <p className="body2-orbit font-medium opacity-90">{profile?.instansi_magang || 'Belum Ditentukan'}</p>
                  <p className="caption-orbit mt-1 opacity-60 uppercase tracking-widest">{profile?.unit_magang || 'Unit Tidak Tersedia'}</p>
               </div>
            </div>
         </div>
      </div>
   )
}
