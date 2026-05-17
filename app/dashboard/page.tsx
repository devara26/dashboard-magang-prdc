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
   Clock
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

// Memaksa Vercel agar tidak melakukan optimasi statis yang merusak pembacaan cookie Supabase auth
export const dynamic = 'force-dynamic'

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

   useEffect(() => {
      fetchData()
   }, [])

   async function fetchData() {
      try {
         setLoading(true)
         const { data: { user }, error: authError } = await supabase.auth.getUser()
         if (authError || !user) {
            setLoading(false)
            return
         }

         const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()

         if (profileError) console.error('Error fetching profile:', profileError)

         const activeProfile = profileData || { id: user.id, nama_lengkap: 'Pengguna ORBIT', nim: '' }
         setProfile(activeProfile)

         // Fetch attendance counts and distribution safely
         const { data: absensiData, error: absensiError } = await supabase
            .from('absensi')
            .select('tanggal')
            .eq('mahasiswa_id', user.id)
            .eq('status', 'Hadir')

         if (absensiError) console.error('Error fetching absensi:', absensiError)

         const safeAbsensi = Array.isArray(absensiData) ? absensiData : []
         const hadirCount = safeAbsensi.length
         const distribution = Array(12).fill(0)

         safeAbsensi.forEach(row => {
            if (row?.tanggal) {
               const date = new Date(row.tanggal)
               if (!isNaN(date.getTime())) {
                  const month = date.getMonth()
                  distribution[month]++
               }
            }
         })
         setMonthlyAttendance(distribution)

         // Fetch journal stats safely without crashing on null keys
         let kegiatanData: any[] = []
         let countSelesai = 0
         let countTotal = 0

         if (activeProfile?.nim) {
            const { data, error } = await supabase
               .from('Kegiatan')
               .select('*')
               .eq('nim', activeProfile.nim)
               .order('tanggal', { ascending: false })
               .limit(3)

            kegiatanData = Array.isArray(data) ? data : []

            const { count: selCount } = await supabase
               .from('Kegiatan')
               .select('*', { count: 'exact', head: true })
               .eq('nim', activeProfile.nim)
               .eq('status_persetujuan', 'Disetujui')

            const { count: totCount } = await supabase
               .from('Kegiatan')
               .select('*', { count: 'exact', head: true })
               .eq('nim', activeProfile.nim)

            countSelesai = selCount || 0
            countTotal = totCount || 0
         }

         // Fetch berkas stats
         const { count: berkasCount, error: berkasError } = await supabase
            .from('berkas')
            .select('*', { count: 'exact', head: true })
            .eq('mahasiswa_id', user.id)

         if (berkasError) console.error('Error fetching berkas:', berkasError)

         setKegiatan(kegiatanData)
         setStats({
            hadir: hadirCount,
            tugasSelesai: countSelesai,
            totalKegiatan: countTotal,
            totalBerkas: berkasCount || 0
         })
      } catch (error) {
         console.error('Critical runtime dashboard error:', error)
         setKegiatan([])
      } {
         setLoading(false)
      }
   }

   const totalHariTarget = 150
   const progressPersen = Math.min(Math.round(((stats.hadir || 0) / totalHariTarget) * 100), 100)
   const currentMonth = new Date().getMonth()

   // Strict Loading Boundary to fully prevent layout calculation flashes
   if (loading) {
      return (
         <div className="fixed inset-0 z-[999] bg-[#F8F9FA] flex items-center justify-center">
            <div className="text-center space-y-6">
               <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
               <p className="text-gray-700 font-bold text-lg tracking-tight">Memuat Dashboard ORBIT...</p>
            </div>
         </div>
      )
   }

   const safeKegiatan = Array.isArray(kegiatan) ? kegiatan : []
   const safeMonthlyAttendance = Array.isArray(monthlyAttendance) ? monthlyAttendance : Array(12).fill(0)

   // Menghitung nilai tertinggi grafik secara aman tanpa math scope crash
   const maxAttendanceVal = safeMonthlyAttendance.length > 0 ? Math.max(...safeMonthlyAttendance) : 0
   const safeMaxVal = maxAttendanceVal > 0 ? maxAttendanceVal : 1

   return (
      <div className="space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
         {/* Header Area */}
         <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-5">
               <div className="w-16 h-16 rounded-full accent-gradient flex items-center justify-center text-white text-2xl font-bold shadow-xl border-4 border-white">
                  {profile?.nama_lengkap?.charAt(0) || 'U'}
               </div>
               <div>
                  <h2 className="h2-orbit text-[var(--text-main)]">Halo, {(profile?.nama_lengkap ?? 'Pengguna').split(' ')[0]}</h2>
                  <p className="body2-orbit text-[var(--text-muted)] mt-1">Selamat datang kembali di platform monitoring ORBIT.</p>
               </div>
            </div>
            <NotificationBell />
         </div>

         {/* Stats Row */}
         <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            <div className="neumorphic-card p-6 flex flex-col items-center text-center shadow-sm">
               <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[var(--accent-blue)] mb-4 shadow-inner">
                  <Calendar size={24} />
               </div>
               <p className="label-orbit text-[var(--text-muted)] mb-1">Kehadiran</p>
               <h4 className="h4-orbit text-[var(--text-main)]">{stats.hadir ?? 0} Hari</h4>
               <p className="caption-orbit text-[var(--text-light)] mt-2 font-medium">Target: {totalHariTarget} Hari</p>
            </div>

            <div className="neumorphic-card p-6 flex flex-col items-center text-center shadow-sm">
               <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 mb-4 shadow-inner">
                  <CheckCircle2 size={24} />
               </div>
               <p className="label-orbit text-[var(--text-muted)] mb-1">Jurnal Disetujui</p>
               <h4 className="h4-orbit text-[var(--text-main)]">{stats.tugasSelesai ?? 0} Log</h4>
               <p className="caption-orbit text-[var(--text-light)] mt-2 font-medium">
                  {Math.round(((stats.tugasSelesai ?? 0) / Math.max(1, stats.totalKegiatan ?? 1)) * 100)}% Rasio
               </p>
            </div>

            <div className="neumorphic-card p-6 flex flex-col items-center text-center col-span-2 md:col-span-1 shadow-sm">
               <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 shadow-inner">
                  <FileText size={24} />
               </div>
               <p className="label-orbit text-[var(--text-muted)] mb-1">Kelengkapan Berkas</p>
               <h4 className="h4-orbit text-[var(--text-main)]">{stats.totalBerkas ?? 0} Dokumen</h4>
               <p className="caption-orbit text-[var(--text-light)] mt-2 font-medium">{stats.totalBerkas}/{DOCUMENT_TYPES_COUNT} Terunggah</p>
            </div>
         </div>

         {/* Progress Section */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="neumorphic-card p-8 flex flex-col items-center shadow-sm">
               <h5 className="h5-orbit text-[var(--text-main)] mb-8">Progres Magang Efektif</h5>
               <div className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 256 256">
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
                     <span className="h2-orbit text-[var(--text-main)] leading-none">{progressPersen}%</span>
                     <span className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest mt-2">Selesai</span>
                  </div>
               </div>
               <div className="mt-8 grid grid-cols-2 gap-6 w-full">
                  <div className="text-center">
                     <p className="h5-orbit text-[var(--text-main)]">{stats.hadir ?? 0}</p>
                     <p className="caption-orbit font-bold text-[var(--text-light)] uppercase">Hadir</p>
                  </div>
                  <div className="text-center">
                     <p className="h5-orbit text-[var(--text-main)]">{totalHariTarget}</p>
                     <p className="caption-orbit font-bold text-[var(--text-light)] uppercase">Target</p>
                  </div>
               </div>
            </div>

            <div className="neumorphic-card p-8 flex flex-col shadow-sm">
               <div className="flex justify-between items-center mb-8">
                  <h5 className="h5-orbit text-[var(--text-main)]">Aktivitas Kehadiran</h5>
                  <div className="px-4 py-2 bg-gray-50 rounded-full flex items-center gap-2 border border-gray-100">
                     <TrendingUp size={16} className="text-[var(--accent-blue)]" />
                     <span className="caption-orbit font-bold">TA 2026</span>
                  </div>
               </div>
               <div className="flex-1 flex items-end justify-between h-[300px] px-2 gap-4">
                  {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((label, i) => {
                     const val = safeMonthlyAttendance[i] ?? 0
                     const height = (val / safeMaxVal) * 100
                     return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-4">
                           <div className="w-full bg-gray-50 rounded-full h-[240px] flex flex-col justify-end overflow-hidden border border-gray-100/50">
                              <div
                                 className={`w-full rounded-full transition-all duration-1000 ease-out ${i === currentMonth ? 'accent-gradient' : 'bg-gray-200'}`}
                                 style={{ height: `${Math.max(8, Math.min(height, 100))}%` }}
                              />
                           </div>
                           <span className={`caption-orbit font-bold ${i === currentMonth ? 'text-[var(--accent-blue)]' : 'text-[var(--text-light)]'}`}>{label}</span>
                        </div>
                     )
                  })}
               </div>
            </div>
         </div>

         {/* Recent Activity */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
               <div className="flex items-center justify-between px-2">
                  <h5 className="h5-orbit text-[var(--text-main)]">Jurnal Terakhir</h5>
                  <button onClick={() => router.push('/dashboard/kegiatan')} className="flex items-center gap-2 text-[var(--accent-blue)] font-bold caption-orbit hover:opacity-70 transition-opacity">
                     Riwayat Lengkap <ChevronRight size={16} />
                  </button>
               </div>
               <div className="space-y-4">
                  {safeKegiatan.length > 0 ? safeKegiatan.map((item, idx) => (
                     <div key={item?.id ?? idx} className="neumorphic-card p-6 flex items-center justify-between group hover:scale-[1.01] transition-all shadow-sm border border-transparent hover:border-gray-100">
                        <div className="flex items-center gap-6">
                           <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[var(--accent-blue)] shadow-inner">
                              <FileText size={24} />
                           </div>
                           <div className="min-w-0">
                              <p className="body2-orbit font-bold text-[var(--text-main)] truncate max-w-[200px] md:max-w-md">
                                 {item?.kegiatan ?? 'Aktivitas tidak tercatat'}
                              </p>
                              <div className="flex items-center gap-4 mt-1">
                                 <span className="caption-orbit text-[var(--text-light)] flex items-center gap-1.5 font-medium">
                                    <Clock size={12} /> {item?.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-- --'}
                                 </span>
                                 <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${item?.status_persetujuan === 'Disetujui' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                    {item?.status_persetujuan ?? 'Menunggu'}
                                 </span>
                              </div>
                           </div>
                        </div>
                        <button className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--text-light)] hover:text-[var(--accent-blue)] hover:bg-white shadow-sm border border-transparent hover:border-gray-100 transition-all">
                           <ChevronRight size={20} />
                        </button>
                     </div>
                  )) : (
                     <div className="neumorphic-card p-12 text-center text-[var(--text-light)] body2-orbit shadow-inner border-dashed">
                        Belum ada data jurnal tersedia.
                     </div>
                  )}
               </div>
            </div>

            <div className="space-y-6">
               <h5 className="h5-orbit text-[var(--text-main)] px-2">Menu Pintas</h5>
               <div className="space-y-4">
                  <button onClick={() => router.push('/dashboard/absensi')} className="neumorphic-button w-full flex items-center justify-center gap-4 accent-gradient text-white py-5 shadow-lg shadow-blue-200/50 active:scale-[0.98] transition-all">
                     <Plus size={20} />
                     <span className="label-orbit font-bold">Presensi Harian</span>
                  </button>
                  <button onClick={() => router.push('/dashboard/kegiatan')} className="neumorphic-button w-full flex items-center justify-center gap-4 bg-white text-[var(--text-main)] py-5 shadow-sm active:scale-[0.98] transition-all">
                     <FileText size={20} className="text-[var(--accent-blue)]" />
                     <span className="label-orbit font-bold">Input Jurnal</span>
                  </button>
               </div>

               <div className="neumorphic-card p-6 accent-gradient text-white mt-10 shadow-lg shadow-blue-100">
                  <div className="flex items-center gap-4 mb-4">
                     <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                        <MapPin size={20} />
                     </div>
                     <p className="label-orbit font-bold uppercase tracking-wider">Lokasi Penempatan</p>
                  </div>
                  <p className="body2-orbit font-bold">{profile?.instansi_magang ?? 'Belum Ditentukan'}</p>
                  <p className="caption-orbit mt-1 opacity-70 font-medium">{profile?.unit_magang ?? 'Unit Kerja ORBIT'}</p>
               </div>
            </div>
         </div>
      </div>
   )
}