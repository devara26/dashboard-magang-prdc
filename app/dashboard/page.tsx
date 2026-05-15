'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { exportLaporanExcel } from '@/lib/export-excel'
import OnboardingWizard from '@/components/OnboardingWizard'

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
        const { data, error } = await supabase.from('kegiatan').select('*').eq('nim', profileData.nim).order('tanggal', { ascending: false }).limit(6)
        kegiatanData = data || []
        
        const [selCount, totCount] = await Promise.all([
          supabase.from('kegiatan').select('*', { count: 'exact', head: true }).eq('nim', profileData.nim).eq('status', 'Selesai'),
          supabase.from('kegiatan').select('*', { count: 'exact', head: true }).eq('nim', profileData.nim)
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
    <div className="space-y-10 pb-20">
      {showOnboarding && userId && (
        <OnboardingWizard userId={userId} onComplete={() => { setShowOnboarding(false); fetchData(); }} />
      )}

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-[28px] font-black tracking-tight text-[var(--text-main)]">Overview</h1>
           <p className="text-[14px] font-medium text-[var(--text-muted)]">Here is the summary of your overall internship data</p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => { setDownloadingExcel(true); exportLaporanExcel(profile).finally(() => setDownloadingExcel(false)); }}
             className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[var(--border)] rounded-xl text-[13px] font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-all"
           >
             <span className="material-symbols-outlined text-[18px]">download</span>
             Export PDF
           </button>
           <button 
             onClick={() => router.push('/dashboard/kegiatan')}
             className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl text-[13px] font-bold hover:opacity-90 shadow-lg shadow-blue-100 transition-all"
           >
             <span className="material-symbols-outlined text-[18px]">add</span>
             Add Activity
           </button>
        </div>
      </div>

      {/* Bento Grid Layer 1: Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Presence Card */}
         <div className="bento-card relative overflow-hidden group">
            <div className="flex justify-between items-start mb-6">
               <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
                  <span className="material-symbols-outlined fill-icon">calendar_month</span>
               </div>
               <button className="text-[var(--text-light)] hover:text-[var(--text-main)]"><span className="material-symbols-outlined">more_horiz</span></button>
            </div>
            <div>
               <p className="text-[13px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Presence Total</p>
               <div className="flex items-baseline gap-3">
                  <h3 className="text-[32px] font-black tracking-tight">{stats.hadir}</h3>
                  <span className="text-[11px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">+ 2.4%</span>
               </div>
               <p className="text-[11px] font-medium text-[var(--text-light)] mt-2">Targeting 150 days of internship</p>
            </div>
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-[var(--accent)]/5 rounded-tl-[100px] -mr-10 -mb-10 group-hover:scale-110 transition-transform"></div>
         </div>

         {/* Tasks Card */}
         <div className="bento-card">
            <div className="flex justify-between items-start mb-6">
               <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-100">
                  <span className="material-symbols-outlined fill-icon">task_alt</span>
               </div>
               <button className="text-[var(--text-light)] hover:text-[var(--text-main)]"><span className="material-symbols-outlined">more_horiz</span></button>
            </div>
            <div>
               <p className="text-[13px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Verified Logs</p>
               <div className="flex items-baseline gap-3">
                  <h3 className="text-[32px] font-black tracking-tight">{stats.tugasSelesai}</h3>
                  <span className="text-[11px] font-bold text-[var(--text-light)] bg-[var(--bg-app)] px-2 py-0.5 rounded-full">{Math.round(stats.tugasSelesai/Math.max(1,stats.totalKegiatan)*100)}%</span>
               </div>
               <p className="text-[11px] font-medium text-[var(--text-light)] mt-2">Verified by your supervisor</p>
            </div>
         </div>

         {/* Performance Card */}
         <div className="bento-card bg-[var(--text-main)] text-white border-none">
            <div className="flex justify-between items-start mb-6">
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-sm">
                  <span className="material-symbols-outlined fill-icon">bolt</span>
               </div>
               <button className="text-white/40 hover:text-white"><span className="material-symbols-outlined">more_horiz</span></button>
            </div>
            <div>
               <p className="text-[13px] font-bold text-white/60 uppercase tracking-wider mb-1">Consistency Streak</p>
               <div className="flex items-baseline gap-3">
                  <h3 className="text-[32px] font-black tracking-tight">{stats.hadir}</h3>
                  <span className="text-[11px] font-bold text-blue-300 bg-white/10 px-2 py-0.5 rounded-full">Top 5%</span>
               </div>
               <p className="text-[11px] font-medium text-white/40 mt-2">Maintaining a strong daily record</p>
            </div>
         </div>
      </div>

      {/* Bento Grid Layer 2: Graph & Mini Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Large Graph Section */}
         <div className="lg:col-span-2 bento-card flex flex-col">
            <div className="flex justify-between items-center mb-10">
               <div>
                  <h4 className="text-[18px] font-black tracking-tight">Performance Overview</h4>
                  <p className="text-[12px] font-medium text-[var(--text-light)]">Your weekly activity distribution</p>
               </div>
               <div className="flex gap-2 bg-[var(--bg-app)] p-1 rounded-lg">
                  <button className="px-3 py-1.5 bg-white text-[10px] font-bold rounded-md shadow-sm">Monthly</button>
                  <button className="px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)]">Yearly</button>
               </div>
            </div>
            <div className="flex-1 flex items-end justify-between h-[240px] px-2">
               {[40, 70, 45, 90, 65, 80, 50, 85, 60, 95, 75, 85].map((h, i) => (
                 <div key={i} className="group relative flex flex-col items-center gap-3 w-full">
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--text-main)] text-white px-2 py-1 rounded text-[10px] font-bold mb-2">
                       {h}%
                    </div>
                    <div className="w-full max-w-[32px] bg-[var(--bg-app)] rounded-full overflow-hidden h-[180px] flex flex-col justify-end">
                       <div 
                         className={`w-full rounded-full transition-all duration-700 delay-[${i*50}ms] ${i === 9 ? 'bg-[var(--accent)] shadow-lg shadow-blue-200' : 'bg-[var(--text-main)]/10 group-hover:bg-[var(--text-main)]/20'}`} 
                         style={{ height: `${h}%` }}
                       />
                    </div>
                    <span className="text-[10px] font-bold text-[var(--text-light)] uppercase">{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span>
                 </div>
               ))}
            </div>
         </div>

         {/* Small Wallet-style Card */}
         <div className="bento-card">
            <h4 className="text-[16px] font-black tracking-tight mb-8">My Placement</h4>
            <div className="space-y-6">
               <div className="flex items-center gap-4 p-4 bg-[var(--bg-app)] rounded-2xl border border-[var(--border)]">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[var(--accent)] shadow-sm">
                     <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
                  </div>
                  <div className="min-w-0">
                     <p className="text-[13px] font-bold truncate">{profile?.instansi_magang || 'No Agency'}</p>
                     <p className="text-[11px] font-semibold text-[var(--text-muted)]">Agency</p>
                  </div>
               </div>
               <div className="flex items-center gap-4 p-4 bg-[var(--bg-app)] rounded-2xl border border-[var(--border)]">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-500 shadow-sm">
                     <span className="material-symbols-outlined text-[20px]">badge</span>
                  </div>
                  <div className="min-w-0">
                     <p className="text-[13px] font-bold truncate">{profile?.unit_magang || 'No Unit'}</p>
                     <p className="text-[11px] font-semibold text-[var(--text-muted)]">Position / Unit</p>
                  </div>
               </div>
               
               <div className="pt-4 flex flex-col items-center">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                     <svg className="w-full h-full -rotate-90">
                        <circle className="text-[var(--bg-app)]" cx="64" cy="64" r="54" fill="transparent" stroke="currentColor" strokeWidth="12" />
                        <circle className="text-[var(--accent)]" cx="64" cy="64" r="54" fill="transparent" stroke="currentColor" strokeWidth="12" strokeDasharray="339.3" strokeDashoffset={339.3 - (339.3 * progressPersen / 100)} strokeLinecap="round" />
                     </svg>
                     <div className="absolute flex flex-col items-center">
                        <span className="text-[20px] font-black leading-none">{progressPersen}%</span>
                        <span className="text-[9px] font-bold text-[var(--text-light)] uppercase tracking-wider mt-1">Days</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Bento Grid Layer 3: Recent Activities Table */}
      <div className="bento-card">
         <div className="flex justify-between items-center mb-8 px-2">
            <h4 className="text-[18px] font-black tracking-tight">Recent Activities</h4>
            <div className="flex items-center gap-4">
               <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-[var(--text-light)]">search</span>
                  <input placeholder="Search logs..." className="pl-10 pr-4 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-xl text-xs font-medium w-48 outline-none focus:border-[var(--accent)] transition-all" />
               </div>
               <button className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-app)] transition-all">
                  <span className="material-symbols-outlined text-[16px]">filter_list</span>
                  Filter
               </button>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full">
               <thead>
                  <tr className="border-b border-[var(--border-light)]">
                     <th className="text-left py-4 px-4 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest">Activity</th>
                     <th className="text-left py-4 px-4 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest">Date</th>
                     <th className="text-left py-4 px-4 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest">Status</th>
                     <th className="text-right py-4 px-4 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-[var(--border-light)]">
                  {kegiatan.map((item, idx) => (
                    <tr key={idx} className="group hover:bg-[var(--bg-app)] transition-colors">
                       <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${idx % 2 === 0 ? 'bg-blue-500' : 'bg-indigo-500'}`}>
                                <span className="material-symbols-outlined text-[16px]">description</span>
                             </div>
                             <p className="text-[13px] font-bold text-[var(--text-main)] truncate max-w-[240px]">{item.kegiatan}</p>
                          </div>
                       </td>
                       <td className="py-4 px-4">
                          <p className="text-[13px] font-medium text-[var(--text-muted)]">{new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                       </td>
                       <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${item.status === 'Selesai' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                             <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                             {item.status}
                          </span>
                       </td>
                       <td className="py-4 px-4 text-right">
                          <button className="text-[var(--text-light)] hover:text-[var(--accent)] transition-colors">
                             <span className="material-symbols-outlined text-[18px]">chevron_right</span>
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
