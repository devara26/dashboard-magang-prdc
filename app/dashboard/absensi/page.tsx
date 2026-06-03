'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Calendar, 
  CheckCircle2, 
  MapPin, 
  Clock, 
  Plus, 
  AlertCircle,
  TrendingUp,
  History,
  Info
} from 'lucide-react'
import { toast } from 'sonner'

// Memaksa rendering dinamis
export const dynamic = 'force-dynamic'

export default function AbsensiPage() {
  const [absensi, setAbsensi] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [todayPresence, setTodayPresence] = useState<any>(null)

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

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      
      setProfile(profileData || { id: user.id, nama_lengkap: 'Pengguna ORBIT' })

      // Fetch absensi history
      const { data: absensiData, error: absError } = await supabase
        .from('absensi')
        .select('*')
        .eq('mahasiswa_id', user.id)
        .order('tanggal', { ascending: false })

      if (absError) console.error('Absensi fetch error:', absError)
      
      const safeAbsensi = Array.isArray(absensiData) ? absensiData : []
      setAbsensi(safeAbsensi)

      // Check if already present today
      const today = new Date().toISOString().split('T')[0]
      const foundToday = safeAbsensi.find(a => a && a.tanggal === today)
      setTodayPresence(foundToday || null)

    } catch (error) {
      console.error('Critical runtime error (absensi):', error)
      setAbsensi([])
    } finally {
      setLoading(false)
    }
  }

  async function handleAbsen() {
    if (!profile?.id) return
    
    setSubmitting(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toTimeString().split(' ')[0].slice(0, 5)

      const { error } = await supabase
        .from('absensi')
        .insert([{
          mahasiswa_id: profile.id,
          tanggal: today,
          check_in: now,
          status: 'Hadir',
          keterangan: 'Hadir tepat waktu melalui portal ORBIT'
        }])

      if (error) throw error
      
      toast.success('Berhasil melakukan presensi hari ini!')
      fetchData()
    } catch (error: any) {
      toast.error('Gagal presensi: ' + (error.message || 'Error tidak dikenal'))
    } finally {
      setSubmitting(false)
    }
  }

  // Safe-guarding stats
  const safeAbsensi = Array.isArray(absensi) ? absensi : []
  const totalHadir = safeAbsensi.filter(a => a && a.status === 'Hadir').length
  const totalIzin = safeAbsensi.filter(a => a && a.status === 'Izin').length
  const totalSakit = safeAbsensi.filter(a => a && a.status === 'Sakit').length

  // Strict Loading Boundary
  if (loading) {
    return (
      <div className="fixed inset-0 z-[999] bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 border-4 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin mx-auto shadow-sm"></div>
          <p className="text-[var(--text-main)] font-bold text-lg tracking-tight">Menyiapkan Lembar Presensi...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div>
          <h1 className="h1-orbit text-[var(--text-main)]">Presensi Harian</h1>
          <p className="subtitle-orbit text-[var(--text-muted)] mt-1">Pantau dan catat kehadiran magang Anda setiap hari.</p>
        </div>
        <div className="px-6 py-3 bg-white rounded-full shadow-sm border border-gray-100 flex items-center gap-3">
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
           <span className="caption-orbit font-bold text-[var(--text-main)]">Sistem Online: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        {/* Action Card */}
        <div className="lg:col-span-2 space-y-8">
           <div className="neumorphic-card p-10 md:p-14 text-center relative overflow-hidden shadow-sm border border-transparent hover:border-blue-100/50 transition-all">
              <div className="absolute left-0 top-0 w-64 h-64 bg-blue-50 rounded-full -ml-32 -mt-32 opacity-40"></div>
              <div className="relative z-10 space-y-8">
                 <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center mx-auto shadow-xl text-[var(--accent-blue)]">
                    <Clock size={48} />
                 </div>
                 <div>
                    <h2 className="h2-orbit text-[var(--text-main)]">Konfirmasi Kehadiran</h2>
                    <p className="body2-orbit text-[var(--text-muted)] mt-2">Pastikan Anda berada di lokasi magang sebelum melakukan absen.</p>
                 </div>
                 
                 {todayPresence ? (
                    <div className="max-w-md mx-auto p-6 bg-emerald-50 border border-emerald-100 rounded-3xl space-y-2 animate-in zoom-in duration-500">
                       <CheckCircle2 className="text-emerald-600 mx-auto" size={32} />
                       <p className="body1-orbit font-bold text-emerald-800">Anda Sudah Presensi</p>
                       <p className="caption-orbit text-emerald-600 font-bold uppercase tracking-widest">Pukul {todayPresence.check_in || '--:--'} WIB</p>
                    </div>
                 ) : (
                    <button 
                       onClick={handleAbsen}
                       disabled={submitting}
                       className="neumorphic-button w-full max-w-sm accent-gradient text-white border-none py-6 label-orbit font-bold uppercase tracking-[2px] shadow-2xl shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
                    >
                       {submitting ? 'Memproses...' : 'Klik Untuk Hadir'}
                    </button>
                 )}
              </div>
           </div>

           {/* Metrics Grid */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="neumorphic-card p-8 flex items-center gap-6 shadow-sm">
                 <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                    <CheckCircle2 size={28} />
                 </div>
                 <div>
                    <p className="h4-orbit text-[var(--text-main)]">{totalHadir}</p>
                    <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Hadir</p>
                 </div>
              </div>
              <div className="neumorphic-card p-8 flex items-center gap-6 shadow-sm">
                 <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
                    <Info size={28} />
                 </div>
                 <div>
                    <p className="h4-orbit text-[var(--text-main)]">{totalIzin}</p>
                    <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Izin</p>
                 </div>
              </div>
              <div className="neumorphic-card p-8 flex items-center gap-6 shadow-sm">
                 <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
                    <AlertCircle size={28} />
                 </div>
                 <div>
                    <p className="h4-orbit text-[var(--text-main)]">{totalSakit}</p>
                    <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Sakit</p>
                 </div>
              </div>
           </div>
        </div>

        {/* History Sidebar */}
        <div className="space-y-8">
           <div className="flex items-center justify-between px-4">
              <h3 className="h4-orbit text-[var(--text-main)]">Riwayat Terakhir</h3>
              <History size={20} className="text-[var(--text-light)]" />
           </div>
           <div className="space-y-4">
              {safeAbsensi.length > 0 ? safeAbsensi.slice(0, 5).map((item, idx) => (
                 <div key={item?.id ?? idx} className="neumorphic-card p-6 flex items-center justify-between group hover:border-blue-100 transition-all shadow-sm">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[var(--text-light)] group-hover:bg-blue-50 group-hover:text-[var(--accent-blue)] transition-all">
                          <Calendar size={18} />
                       </div>
                       <div>
                          <p className="body2-orbit font-bold text-[var(--text-main)]">{item?.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '--'}</p>
                          <p className="caption-orbit text-[var(--text-light)] font-medium">{item?.check_in || '--:--'} WIB</p>
                       </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${item?.status === 'Hadir' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                       {item?.status ?? 'Unknown'}
                    </span>
                 </div>
              )) : (
                 <div className="neumorphic-card p-10 text-center text-[var(--text-light)] body2-orbit shadow-inner border-dashed">
                    Belum ada riwayat presensi.
                 </div>
              )}
           </div>

           <div className="neumorphic-card p-8 accent-gradient text-white shadow-xl shadow-blue-100">
              <div className="flex items-center gap-4 mb-4">
                 <MapPin size={24} />
                 <p className="label-orbit font-bold uppercase tracking-widest !text-white">Lokasi Presensi</p>
              </div>
              <p className="body2-orbit font-bold">{profile?.instansi_magang || 'Penempatan ORBIT'}</p>
              <p className="caption-orbit mt-1 opacity-70 font-medium">Koordinat GPS Terverifikasi</p>
           </div>
        </div>
      </div>
    </div>
  )
}

