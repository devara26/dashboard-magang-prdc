'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { logAction } from '@/lib/audit'
import { 
  Fingerprint, 
  LogOut, 
  LogIn, 
  Calendar, 
  Flame, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  X,
  TrendingUp,
  History,
  FileEdit
} from 'lucide-react'

type Absensi = {
  id: number
  tanggal: string
  check_in: string | null
  check_out: string | null
  status: string
  keterangan: string | null
}

export default function AbsensiPage() {
  const [absensi, setAbsensi] = useState<Absensi[]>([])
  const [todayRecord, setTodayRecord] = useState<Absensi | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)
  const [manualForm, setManualForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    check_in: '08:00',
    check_out: '17:00',
    status: 'Hadir',
    keterangan: ''
  })

  const today = new Date().toISOString().split('T')[0]
  const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' })

  useEffect(() => { fetchAbsensi() }, [])

  async function fetchAbsensi() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('absensi')
        .select('*')
        .eq('mahasiswa_id', user.id)
        .order('tanggal', { ascending: false })

      if (error) throw error
      setAbsensi(data || [])
      setTodayRecord(data?.find(a => a.tanggal === today) || null)
    } catch (error: any) {
      toast.error('Gagal memuat data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckIn() {
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('absensi').insert({
        mahasiswa_id: user?.id,
        tanggal: today,
        check_in: nowTime,
        status: 'Hadir',
      })
      if (error) throw error
      await logAction('Check-in', `Check-in pada ${nowTime}`)
      toast.success('Check-in Berhasil')
      fetchAbsensi()
    } catch (error: any) {
      toast.error('Gagal: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCheckOut() {
    setSubmitting(true)
    try {
      if (!todayRecord) throw new Error('Data tidak ditemukan')
      const { error } = await supabase.from('absensi').update({ check_out: nowTime }).eq('id', todayRecord.id)
      if (error) throw error
      await logAction('Check-out', `Check-out pada ${nowTime}`)
      toast.success('Check-out Berhasil')
      fetchAbsensi()
    } catch (error: any) {
      toast.error('Gagal: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
     e.preventDefault()
     setSubmitting(true)
     try {
        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase.from('absensi').insert({
           mahasiswa_id: user?.id,
           ...manualForm
        })
        if (error) throw error
        toast.success('Entri manual berhasil disimpan')
        setShowManualModal(false)
        fetchAbsensi()
     } catch (error: any) {
        toast.error('Gagal: ' + error.message)
     } finally {
        setSubmitting(false)
     }
  }

  const streak = absensi.filter(a => a.status === 'Hadir').length

  if (loading) return null

  return (
    <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div>
           <h1 className="h1-orbit text-[var(--text-main)]">Kehadiran</h1>
           <p className="subtitle-orbit text-[var(--text-muted)] mt-1">Pantau kehadiran harian dan jam kerja magang Anda.</p>
        </div>
        <button 
          onClick={() => setShowManualModal(true)}
          className="neumorphic-button flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent-blue)] transition-colors"
        >
          <Plus size={20} />
          <span className="label-orbit font-bold">Input Manual</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Status Area */}
        <div className="lg:col-span-7 space-y-10">
           <section className="neumorphic-card p-10 relative overflow-hidden">
              <h4 className="h4-orbit text-[var(--text-main)] mb-10 flex items-center gap-3">
                 <div className="w-2 h-8 accent-gradient rounded-full"></div>
                 Status Hari Ini
              </h4>

              <div className="relative space-y-16">
                 {/* Timeline Line */}
                 <div className="absolute left-[39px] top-4 bottom-4 w-1 bg-gray-100 rounded-full"></div>
                 
                 {/* Check-in Step */}
                 <div className="flex items-center gap-10 relative z-10">
                    <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center transition-all duration-700 shadow-lg ${todayRecord?.check_in ? 'accent-gradient text-white scale-110' : 'bg-white border-4 border-gray-50 text-[var(--text-light)]'}`}>
                       <LogIn size={32} />
                    </div>
                    <div className="flex-1">
                       <h3 className={`body1-orbit font-bold ${todayRecord?.check_in ? 'text-[var(--text-main)]' : 'text-[var(--text-light)]'}`}>Check-in Pagi</h3>
                       <p className="body2-orbit text-[var(--text-muted)] mt-1 font-medium">
                          {todayRecord?.check_in ? `Tercatat pada jam ${todayRecord.check_in}` : 'Belum melakukan registrasi pagi'}
                       </p>
                    </div>
                    {todayRecord?.check_in && (
                       <CheckCircle2 size={24} className="text-emerald-500" />
                    )}
                 </div>

                 {/* Check-out Step */}
                 <div className="flex items-center gap-10 relative z-10">
                    <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center transition-all duration-700 shadow-lg ${todayRecord?.check_out ? 'bg-orange-500 text-white scale-110' : 'bg-white border-4 border-gray-50 text-[var(--text-light)]'}`}>
                       <LogOut size={32} />
                    </div>
                    <div className="flex-1">
                       <h3 className={`body1-orbit font-bold ${todayRecord?.check_out ? 'text-[var(--text-main)]' : 'text-[var(--text-light)]'}`}>Check-out Sore</h3>
                       <p className="body2-orbit text-[var(--text-muted)] mt-1 font-medium">
                          {todayRecord?.check_out ? `Tercatat pada jam ${todayRecord.check_out}` : 'Menunggu akhir jam kerja'}
                       </p>
                    </div>
                    {todayRecord?.check_out && (
                       <CheckCircle2 size={24} className="text-emerald-500" />
                    )}
                 </div>
              </div>

              <div className="mt-16 pt-10 border-t border-gray-50">
                 {!todayRecord || (todayRecord.status === 'Hadir' && !todayRecord.check_out) ? (
                    <button 
                      onClick={!todayRecord ? handleCheckIn : handleCheckOut}
                      disabled={submitting}
                      className="w-full py-6 accent-gradient text-white rounded-3xl label-orbit font-bold uppercase tracking-widest shadow-2xl hover:shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                    >
                      <Fingerprint size={24} />
                      {!todayRecord ? 'KONFIRMASI CHECK-IN' : 'KONFIRMASI CHECK-OUT'}
                    </button>
                 ) : (
                    <div className="w-full py-6 bg-emerald-50 border-2 border-emerald-100 text-emerald-600 rounded-3xl label-orbit font-bold uppercase tracking-widest flex items-center justify-center gap-4">
                       <CheckCircle2 size={24} />
                       KEHADIRAN HARI INI SELESAI
                    </div>
                 )}
              </div>
           </section>

           {/* History Table */}
           <section className="neumorphic-card p-10">
              <div className="flex items-center justify-between mb-10 px-2">
                 <h4 className="h4-orbit text-[var(--text-main)]">Riwayat Terbaru</h4>
                 <div className="p-3 bg-gray-50 rounded-2xl text-[var(--text-muted)]">
                    <History size={20} />
                 </div>
              </div>
              <div className="space-y-6">
                 {absensi.length > 0 ? absensi.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-6 bg-white rounded-3xl border border-gray-50 shadow-sm hover:shadow-md transition-all">
                       <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-[var(--accent-blue)] border border-blue-100">
                             <Calendar size={20} />
                          </div>
                          <div>
                             <p className="body2-orbit font-bold text-[var(--text-main)]">{new Date(record.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                             <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border mt-1 inline-block ${record.status === 'Hadir' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                {record.status}
                             </span>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="body2-orbit font-bold text-[var(--text-main)] tracking-tight">
                             {record.check_in || '--:--'} <span className="text-gray-300 mx-1">/</span> {record.check_out || '--:--'}
                          </p>
                          <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest mt-1">JAM KERJA</p>
                       </div>
                    </div>
                 )) : (
                    <div className="text-center py-10 body2-orbit text-[var(--text-muted)] italic">
                       Belum ada riwayat kehadiran.
                    </div>
                 )}
              </div>
           </section>
        </div>

        {/* Sidebar Area */}
        <div className="lg:col-span-5 space-y-10">
           {/* Streak Card */}
           <section className="neumorphic-card p-10 accent-gradient text-white border-none overflow-hidden relative group">
              <div className="absolute -right-12 -bottom-12 opacity-10 group-hover:scale-125 transition-transform duration-1000 rotate-12">
                 <Flame size={280} />
              </div>
              <div className="relative z-10 space-y-10">
                 <div className="flex items-center justify-between">
                    <span className="px-4 py-1.5 bg-white/20 backdrop-blur-lg rounded-full caption-orbit font-bold uppercase tracking-widest border border-white/20">Streak Kehadiran</span>
                    <TrendingUp size={24} className="text-white/60" />
                 </div>
                 <div>
                    <h4 className="text-[80px] font-bold tracking-tighter leading-none mb-4 drop-shadow-lg">{streak}</h4>
                    <p className="h4-orbit text-white tracking-tight">Hari Hadir Aktif</p>
                    <p className="body2-orbit text-white/70 mt-6 leading-relaxed font-medium">
                       Anda telah konsisten! Kehadiran rutin merupakan faktor kunci dalam evaluasi akhir magang Anda.
                    </p>
                 </div>
              </div>
           </section>

           {/* Tips / Note Card */}
           <section className="neumorphic-card p-10 flex items-start gap-6 border-l-8 border-l-amber-400">
              <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-600 shrink-0 border border-amber-100 shadow-sm">
                 <AlertCircle size={28} />
              </div>
              <div>
                 <h4 className="body1-orbit font-bold text-[var(--text-main)]">Jam Operasional</h4>
                 <p className="body2-orbit text-[var(--text-muted)] mt-2 leading-relaxed font-medium">
                    Pastikan Anda melakukan check-in sebelum jam **08:30 WIB** dan check-out setelah jam **17:00 WIB** untuk menjaga penilaian performa tetap maksimal.
                 </p>
              </div>
           </section>

           {/* Manual Form Preview Button (Mobile Friendly) */}
           <div className="neumorphic-card p-8 text-center space-y-4">
              <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Lupa Absensi?</p>
              <button 
                 onClick={() => setShowManualModal(true)}
                 className="w-full py-4 bg-white border-2 border-gray-100 text-[var(--text-muted)] hover:text-[var(--accent-blue)] hover:border-[var(--accent-blue)] rounded-2xl label-orbit font-bold transition-all shadow-sm flex items-center justify-center gap-3"
              >
                 <FileEdit size={18} />
                 AJUKAN ENTRI MANUAL
              </button>
           </div>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showManualModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="neumorphic-card w-full max-w-xl p-10 relative z-10 animate-in zoom-in-95 duration-300">
               <form onSubmit={handleManualSubmit} className="space-y-10">
                  <div className="flex justify-between items-start">
                     <div>
                        <h3 className="h3-orbit text-[var(--text-main)]">Input Kehadiran Manual</h3>
                        <p className="subtitle-orbit text-[var(--text-muted)] mt-1">Ajukan koreksi kehadiran Anda.</p>
                     </div>
                     <button type="button" onClick={() => setShowManualModal(false)} className="w-12 h-12 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                        <X size={24} />
                     </button>
                  </div>

                  <div className="space-y-8">
                     <div className="space-y-3">
                        <label className="label-orbit font-bold text-[var(--text-main)] flex items-center gap-2">
                           <Calendar size={18} className="text-[var(--accent-blue)]" />
                           Tanggal Kehadiran
                        </label>
                        <input 
                           type="date" 
                           required 
                           value={manualForm.tanggal} 
                           onChange={e => setManualForm({ ...manualForm, tanggal: e.target.value })} 
                           className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[16px] font-medium outline-none focus:ring-4 focus:ring-[var(--accent-blue)]/10 focus:bg-white transition-all shadow-inner" 
                        />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="label-orbit font-bold text-[var(--text-main)] flex items-center gap-2">
                              <LogIn size={18} className="text-emerald-500" />
                              Waktu Masuk
                           </label>
                           <input 
                              type="time" 
                              required 
                              value={manualForm.check_in} 
                              onChange={e => setManualForm({ ...manualForm, check_in: e.target.value })} 
                              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[16px] font-medium outline-none focus:ring-4 focus:ring-[var(--accent-blue)]/10 focus:bg-white transition-all shadow-inner" 
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="label-orbit font-bold text-[var(--text-main)] flex items-center gap-2">
                              <LogOut size={18} className="text-orange-500" />
                              Waktu Keluar
                           </label>
                           <input 
                              type="time" 
                              required 
                              value={manualForm.check_out} 
                              onChange={e => setManualForm({ ...manualForm, check_out: e.target.value })} 
                              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[16px] font-medium outline-none focus:ring-4 focus:ring-[var(--accent-blue)]/10 focus:bg-white transition-all shadow-inner" 
                           />
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="label-orbit font-bold text-[var(--text-main)] flex items-center gap-2">
                           <Clock size={18} className="text-[var(--accent-blue)]" />
                           Status
                        </label>
                        <select 
                           value={manualForm.status} 
                           onChange={e => setManualForm({ ...manualForm, status: e.target.value })} 
                           className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[16px] font-medium outline-none focus:ring-4 focus:ring-[var(--accent-blue)]/10 focus:bg-white transition-all shadow-inner appearance-none cursor-pointer"
                        >
                           <option value="Hadir">Hadir</option>
                           <option value="Izin">Izin</option>
                           <option value="Sakit">Sakit</option>
                        </select>
                     </div>
                  </div>

                  <button 
                     type="submit" 
                     disabled={submitting} 
                     className="w-full py-5 accent-gradient text-white rounded-2xl label-orbit font-bold uppercase tracking-widest shadow-xl hover:shadow-blue-200 disabled:opacity-50 transition-all active:scale-95"
                  >
                     {submitting ? 'Menyimpan...' : 'Simpan Entri Manual'}
                  </button>
               </form>
            </div>
         </div>
      )}
    </div>
  )
}
