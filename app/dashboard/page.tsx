'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { exportLaporanExcel } from '@/lib/export-excel'
import OnboardingWizard from '@/components/OnboardingWizard'
import { 
  Download, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Zap, 
  TrendingUp, 
  BarChart3, 
  Building2, 
  Briefcase, 
  FileText, 
  ChevronRight,
  MoreHorizontal,
  Search,
  Filter
} from 'lucide-react'

export default function DashboardPage() {
   const router = useRouter()
   const [profile, setProfile] = useState<any>(null)
   const [kegiatan, setKegiatan] = useState<any[]>([])
   const [stats, setStats] = useState({ hadir: 0, tugasSelesai: 0, totalKegiatan: 0 })
   const [loading, setLoading] = useState(true)
   const [downloadingExcel, setDownloadingExcel] = useState(false)
   const [showOnboarding, setShowOnboarding] = useState(false)
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

         if (!profileData?.nim || !profileData?.instansi_magang) setShowOnboarding(true)

         const { count: countHadir } = await supabase.from('absensi').select('*', { count: 'exact', head: true }).eq('mahasiswa_id', user.id).eq('status', 'Hadir')

         let kegiatanData: any[] = []
         let countSelesai = 0
         let countTotal = 0

         if (profileData?.nim) {
            const { data, error } = await supabase.from('Kegiatan').select('*').eq('nim', profileData.nim).order('tanggal', { ascending: false }).limit(6)
            kegiatanData = data || []

            const [selCount, totCount] = await Promise.all([
               supabase.from('Kegiatan').select('*', { count: 'exact', head: true }).eq('nim', profileData.nim).eq('status', 'Selesai'),
               supabase.from('Kegiatan').select('*', { count: 'exact', head: true }).eq('nim', profileData.nim)
            ])
            countSelesai = selCount.count || 0
            countTotal = totCount.count || 0
         }

         setKegiatan(kegiatanData)
         setStats({ hadir: countHadir || 0, tugasSelesai: countSelesai, totalKegiatan: countTotal })
      } catch (error) {
         console.error(error)
      } finally {
         setLoading(false)
      }
   }

   const totalHariTarget = 150
   const progressPersen = Math.min(Math.round((stats.hadir / totalHariTarget) * 100), 100)

   if (loading) return null

   return (
      <div className="space-y-10 pb-20 animate-in fade-in duration-700">
         {showOnboarding && userId && (
            <OnboardingWizard userId={userId} onComplete={() => { setShowOnboarding(false); fetchData(); }} />
         )}

         {/* Hero Header */}
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
               <h1 className="text-[32px] font-black tracking-tight text-[#1A1A1A] mb-1">Morning, {profile?.nama_lengkap?.split(' ')[0]}</h1>
               <p className="text-[14px] font-bold text-[#666666] tracking-tight">Here's a summary of your internship progress</p>
            </div>
            <div className="flex items-center gap-3">
               <button
                  onClick={() => { setDownloadingExcel(true); exportLaporanExcel(profile).finally(() => setDownloadingExcel(false)); }}
                  className="flex items-center gap-2.5 px-6 py-3 bg-white border border-[#E8E8E8] rounded-2xl text-[13px] font-bold text-[#1A1A1A] hover:bg-gray-50 hover:shadow-sm transition-all"
               >
                  <Download size={16} strokeWidth={2.5} />
                  Export Data
               </button>
               <button
                  onClick={() => router.push('/dashboard/kegiatan')}
                  className="flex items-center gap-2.5 px-6 py-3 bg-[#0066FF] text-white rounded-2xl text-[13px] font-black hover:bg-[#0052CC] shadow-lg shadow-blue-200 transition-all active:scale-95"
               >
                  <Plus size={16} strokeWidth={3} />
                  New Activity
               </button>
            </div>
         </div>

         {/* Bento Grid Layer 1: Premium Stats */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Presence Card */}
            <div className="bg-white rounded-[32px] p-8 border border-[#E8E8E8] shadow-sm relative overflow-hidden group hover:border-[#0066FF]/20 transition-all">
               <div className="flex justify-between items-start mb-8">
                  <div className="w-12 h-12 bg-[#0066FF] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                     <Calendar size={22} strokeWidth={2.5} />
                  </div>
                  <button className="text-[#A0A0A0] hover:text-[#1A1A1A] transition-colors"><MoreHorizontal size={20} /></button>
               </div>
               <div>
                  <p className="text-[11px] font-black text-[#A0A0A0] uppercase tracking-[0.1em] mb-2">Presence Total</p>
                  <div className="flex items-center gap-3">
                     <h3 className="text-[36px] font-black tracking-tighter text-[#1A1A1A]">{stats.hadir}</h3>
                     <div className="flex items-center gap-1 text-[11px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                        <TrendingUp size={12} strokeWidth={3} />
                        2.4%
                     </div>
                  </div>
                  <p className="text-[12px] font-bold text-[#666666] mt-3">Target: {totalHariTarget} working days</p>
               </div>
               <div className="absolute right-0 bottom-0 w-32 h-32 bg-[#0066FF]/5 rounded-tl-[100px] -mr-10 -mb-10 group-hover:scale-110 transition-transform"></div>
            </div>

            {/* Tasks Card */}
            <div className="bg-white rounded-[32px] p-8 border border-[#E8E8E8] shadow-sm relative overflow-hidden group hover:border-[#0066FF]/20 transition-all">
               <div className="flex justify-between items-start mb-8">
                  <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-100">
                     <CheckCircle2 size={22} strokeWidth={2.5} />
                  </div>
                  <button className="text-[#A0A0A0] hover:text-[#1A1A1A] transition-colors"><MoreHorizontal size={20} /></button>
               </div>
               <div>
                  <p className="text-[11px] font-black text-[#A0A0A0] uppercase tracking-[0.1em] mb-2">Verified Logs</p>
                  <div className="flex items-center gap-3">
                     <h3 className="text-[36px] font-black tracking-tighter text-[#1A1A1A]">{stats.tugasSelesai}</h3>
                     <div className="text-[11px] font-black text-[#666666] bg-[#F4F4F4] px-2.5 py-1 rounded-full">
                        {Math.round(stats.tugasSelesai / Math.max(1, stats.totalKegiatan) * 100)}% Verified
                     </div>
                  </div>
                  <p className="text-[12px] font-bold text-[#666666] mt-3">Approved by supervisor</p>
               </div>
            </div>

            {/* Performance Card - High Contrast Dark */}
            <div className="bg-[#1A1A1A] rounded-[32px] p-8 shadow-2xl relative overflow-hidden group border border-transparent">
               <div className="flex justify-between items-start mb-8">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-sm">
                     <Zap size={22} strokeWidth={2.5} fill="currentColor" />
                  </div>
                  <button className="text-white/30 hover:text-white transition-colors"><MoreHorizontal size={20} /></button>
               </div>
               <div>
                  <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.1em] mb-2">Consistency Streak</p>
                  <div className="flex items-center gap-3">
                     <h3 className="text-[36px] font-black tracking-tighter text-white">{stats.hadir}</h3>
                     <div className="text-[11px] font-black text-blue-400 bg-white/10 px-2.5 py-1 rounded-full border border-white/5">
                        Elite Tier
                     </div>
                  </div>
                  <p className="text-[12px] font-bold text-white/40 mt-3">Active for {stats.hadir} consecutive days</p>
               </div>
               <div className="absolute right-0 bottom-0 w-40 h-40 bg-[#0066FF]/10 rounded-full blur-[60px] pointer-events-none"></div>
            </div>
         </div>

         {/* Bento Grid Layer 2: Analytics & Info */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Section */}
            <div className="lg:col-span-2 bg-white rounded-[32px] p-10 border border-[#E8E8E8] shadow-sm flex flex-col">
               <div className="flex justify-between items-center mb-12">
                  <div>
                     <h4 className="text-[20px] font-black tracking-tight text-[#1A1A1A]">Activity Analytics</h4>
                     <p className="text-[13px] font-bold text-[#A0A0A0] mt-0.5">Your daily distribution this year</p>
                  </div>
                  <div className="flex gap-2 bg-[#F4F4F4] p-1.5 rounded-2xl">
                     <button className="px-4 py-2 bg-white text-[11px] font-black rounded-xl shadow-sm text-[#1A1A1A]">Monthly</button>
                     <button className="px-4 py-2 text-[11px] font-black text-[#A0A0A0] hover:text-[#1A1A1A] transition-colors">Weekly</button>
                  </div>
               </div>
               <div className="flex-1 flex items-end justify-between h-[240px] px-2 gap-3">
                  {[40, 70, 45, 90, 65, 80, 50, 85, 60, 95, 75, 85].map((h, i) => (
                     <div key={i} className="group relative flex flex-col items-center gap-4 w-full max-w-[40px]">
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 bg-[#1A1A1A] text-white px-3 py-1.5 rounded-xl text-[11px] font-black shadow-xl z-10">
                           {h}%
                        </div>
                        <div className="w-full bg-[#F4F4F4] rounded-full overflow-hidden h-[180px] flex flex-col justify-end p-1">
                           <div
                              className={`w-full rounded-full transition-all duration-1000 ease-out ${i === 9 ? 'bg-[#0066FF] shadow-lg shadow-blue-200' : 'bg-[#1A1A1A]/5 group-hover:bg-[#1A1A1A]/10'}`}
                              style={{ height: `${h}%` }}
                           />
                        </div>
                        <span className="text-[11px] font-black text-[#A0A0A0] group-hover:text-[#1A1A1A] uppercase tracking-wider transition-colors">{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</span>
                     </div>
                  ))}
               </div>
            </div>

            {/* Placement Details */}
            <div className="bg-white rounded-[32px] p-10 border border-[#E8E8E8] shadow-sm flex flex-col">
               <h4 className="text-[18px] font-black tracking-tight text-[#1A1A1A] mb-8">My Placement</h4>
               <div className="space-y-6 flex-1">
                  <div className="flex items-center gap-4 p-5 bg-[#F4F4F4] rounded-[24px] group hover:bg-white hover:border-[#E8E8E8] border border-transparent transition-all">
                     <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#0066FF] shadow-sm border border-[#E8E8E8]">
                        <Building2 size={20} strokeWidth={2.5} />
                     </div>
                     <div className="min-w-0">
                        <p className="text-[14px] font-black text-[#1A1A1A] truncate tracking-tight">{profile?.instansi_magang || 'Unassigned'}</p>
                        <p className="text-[11px] font-bold text-[#A0A0A0] uppercase tracking-wider mt-0.5">Corporate Agency</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4 p-5 bg-[#F4F4F4] rounded-[24px] group hover:bg-white hover:border-[#E8E8E8] border border-transparent transition-all">
                     <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm border border-[#E8E8E8]">
                        <Briefcase size={20} strokeWidth={2.5} />
                     </div>
                     <div className="min-w-0">
                        <p className="text-[14px] font-black text-[#1A1A1A] truncate tracking-tight">{profile?.unit_magang || 'No Unit Selected'}</p>
                        <p className="text-[11px] font-bold text-[#A0A0A0] uppercase tracking-wider mt-0.5">Assigned Position</p>
                     </div>
                  </div>

                  <div className="pt-8 flex flex-col items-center">
                     <div className="relative w-36 h-36 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90">
                           <circle className="text-[#F4F4F4]" cx="72" cy="72" r="62" fill="transparent" stroke="currentColor" strokeWidth="12" />
                           <circle className="text-[#0066FF]" cx="72" cy="72" r="62" fill="transparent" stroke="currentColor" strokeWidth="12" strokeDasharray="389.5" strokeDashoffset={389.5 - (389.5 * progressPersen / 100)} strokeLinecap="round" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                           <span className="text-[28px] font-black leading-none text-[#1A1A1A] tracking-tighter">{progressPersen}%</span>
                           <span className="text-[10px] font-black text-[#A0A0A0] uppercase tracking-[0.2em] mt-2">Complete</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Bento Grid Layer 3: Modern Table */}
         <div className="bg-white rounded-[32px] p-8 border border-[#E8E8E8] shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 px-2">
               <div>
                  <h4 className="text-[20px] font-black tracking-tight text-[#1A1A1A]">Recent Activity Logs</h4>
                  <p className="text-[13px] font-bold text-[#A0A0A0]">Your latest contributions and updates</p>
               </div>
               <div className="flex items-center gap-3">
                  <div className="relative flex-1 md:w-64">
                     <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A0A0A0]" />
                     <input placeholder="Search journals..." className="w-full pl-11 pr-4 py-3 bg-[#F4F4F4] border-transparent rounded-2xl text-[13px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#0066FF]/20 transition-all" />
                  </div>
                  <button className="flex items-center gap-2 px-5 py-3 border border-[#E8E8E8] rounded-2xl text-[13px] font-black text-[#666666] hover:bg-[#F4F4F4] transition-all">
                     <Filter size={16} />
                     Filter
                  </button>
               </div>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full">
                  <thead>
                     <tr className="border-b border-[#F4F4F4]">
                        <th className="text-left py-5 px-4 text-[11px] font-black text-[#A0A0A0] uppercase tracking-[0.15em]">Log Description</th>
                        <th className="text-left py-5 px-4 text-[11px] font-black text-[#A0A0A0] uppercase tracking-[0.15em]">Timestamp</th>
                        <th className="text-left py-5 px-4 text-[11px] font-black text-[#A0A0A0] uppercase tracking-[0.15em]">Status</th>
                        <th className="text-right py-5 px-4 text-[11px] font-black text-[#A0A0A0] uppercase tracking-[0.15em]">Action</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F4F4]">
                     {kegiatan.map((item, idx) => (
                        <tr key={idx} className="group hover:bg-[#F4F4F4]/50 transition-colors">
                           <td className="py-5 px-4">
                              <div className="flex items-center gap-4">
                                 <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm ${idx % 2 === 0 ? 'bg-[#0066FF]' : 'bg-indigo-600'}`}>
                                    <FileText size={18} />
                                 </div>
                                 <p className="text-[14px] font-bold text-[#1A1A1A] truncate max-w-[280px] tracking-tight">{item.kegiatan}</p>
                              </div>
                           </td>
                           <td className="py-5 px-4">
                              <p className="text-[13px] font-bold text-[#666666]">{new Date(item.tanggal).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                           </td>
                           <td className="py-5 px-4">
                              <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${item.status === 'Selesai' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                                 <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                                 {item.status}
                              </span>
                           </td>
                           <td className="py-5 px-4 text-right">
                              <button className="w-10 h-10 flex items-center justify-center rounded-full text-[#A0A0A0] hover:text-[#0066FF] hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-[#E8E8E8]">
                                 <ChevronRight size={18} />
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
   )
}
