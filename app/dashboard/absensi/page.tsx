'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { logAction } from '@/lib/audit'
import Link from 'next/link'

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
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualForm, setManualForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    check_in: '08:00',
    check_out: '17:00',
    status: 'Hadir',
    keterangan: ''
  })

  const today = new Date().toISOString().split('T')[0]
  const nowTime = new Date().toTimeString().split(' ')[0].slice(0, 5)

  useEffect(() => { fetchAbsensi() }, [])

  async function fetchAbsensi() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Sesi tidak ditemukan.')

      const { data, error } = await supabase
        .from('absensi')
        .select('*')
        .eq('mahasiswa_id', user.id)
        .order('tanggal', { ascending: false })

      if (error) throw error
      setAbsensi(data || [])
      setTodayRecord(data?.find(a => a.tanggal === today) || null)
    } catch (error: any) {
      toast.error('Gagal memuat data absensi: ' + error.message)
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
        tanggal: manualForm.tanggal,
        check_in: manualForm.status === 'Hadir' ? manualForm.check_in : null,
        check_out: manualForm.status === 'Hadir' ? manualForm.check_out : null,
        status: manualForm.status,
        keterangan: manualForm.status !== 'Hadir' ? manualForm.keterangan : null,
      })
      if (error) throw error
      toast.success('Data absensi ditambahkan')
      setShowManualForm(false)
      fetchAbsensi()
    } catch (error: any) {
      toast.error('Gagal: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const streak = (() => {
    if (absensi.length === 0) return 0
    let count = 0
    const sorted = [...absensi].filter(a => a.status === 'Hadir').sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    if (sorted.length === 0) return 0
    
    // Simple streak: consecutive entries in the sorted list
    // A more complex one would check for actual date gaps
    return sorted.length // Temporary simple logic matching user expectation of total hadir
  })()

  if (loading) return null

  return (
    <div className="animate-fade-in space-y-10">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-[32px] leading-[40px] font-bold tracking-tight text-[var(--on-surface)]">Presensi Magang</h1>
          <p className="text-[14px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest mt-1">Konfirmasi Kehadiran Harian</p>
        </div>
        <button
          onClick={() => setShowManualForm(true)}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-[var(--surface-container-high)] text-[var(--primary)] border border-[var(--primary)]/20 rounded-[24px] font-black text-sm hover:bg-[var(--primary-container)] transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Entri Manual
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Status & Timeline */}
        <div className="lg:col-span-7 space-y-10">
          {/* Main Status Card */}
          <section className="bg-[var(--surface-container-lowest)] rounded-[40px] p-10 border border-[var(--outline-variant)] shadow-sm">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-1.5 h-6 bg-[var(--primary)] rounded-full"></div>
              <h2 className="text-[20px] font-black text-[var(--on-surface)]">Status Hari Ini</h2>
            </div>

            <div className="space-y-10 relative">
              <div className="absolute left-[27px] top-4 bottom-4 w-0.5 border-l-2 border-dashed border-[var(--outline-variant)]/50"></div>
              
              {/* Check-in Step */}
              <div className="flex gap-8 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-all ${todayRecord?.check_in ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-container-high)] text-[var(--outline)]'}`}>
                  <span className="material-symbols-outlined text-[28px]">{todayRecord?.check_in ? 'login' : 'login'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-[18px] font-black ${todayRecord?.check_in ? 'text-[var(--on-surface)]' : 'text-[var(--outline)]'}`}>Check-in</h3>
                  <p className="text-[14px] font-medium text-[var(--on-surface-variant)] mt-1">
                    {todayRecord?.check_in ? `Tercatat pada pukul ${todayRecord.check_in}` : 'Belum melakukan check-in untuk hari ini.'}
                  </p>
                </div>
              </div>

              {/* Check-out Step */}
              <div className="flex gap-8 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-all ${todayRecord?.check_out ? 'bg-[var(--tertiary)] text-white' : 'bg-[var(--surface-container-high)] text-[var(--outline)]'}`}>
                  <span className="material-symbols-outlined text-[28px]">{todayRecord?.check_out ? 'logout' : 'logout'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-[18px] font-black ${todayRecord?.check_out ? 'text-[var(--on-surface)]' : 'text-[var(--outline)]'}`}>Check-out</h3>
                  <p className="text-[14px] font-medium text-[var(--on-surface-variant)] mt-1">
                    {todayRecord?.check_out ? `Tercatat pada pukul ${todayRecord.check_out}` : 'Jangan lupa melakukan check-out saat jam kerja berakhir.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-10 border-t border-[var(--outline-variant)]/30">
              {(!todayRecord || (todayRecord.status === 'Hadir' && !todayRecord.check_out)) ? (
                <button 
                  onClick={!todayRecord ? handleCheckIn : handleCheckOut}
                  disabled={submitting}
                  className="w-full py-5 bg-[var(--primary)] text-white rounded-[24px] font-black text-sm shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined">{!todayRecord ? 'person_pin_circle' : 'verified'}</span>
                  {!todayRecord ? 'KONFIRMASI KEHADIRAN' : 'KONFIRMASI PULANG'}
                </button>
              ) : (
                <div className="w-full py-5 bg-[var(--surface-container-low)] border border-[var(--outline-variant)]/50 text-[var(--outline)] rounded-[24px] font-black text-sm flex items-center justify-center gap-3">
                  <span className="material-symbols-outlined">task_alt</span>
                  ABSENSI HARI INI SELESAI
                </div>
              )}
            </div>
          </section>

          {/* History Section */}
          <section className="bg-[var(--surface-container-lowest)] rounded-[40px] p-10 border border-[var(--outline-variant)] shadow-sm">
             <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-4">
                 <div className="w-1.5 h-6 bg-[var(--tertiary)] rounded-full"></div>
                 <h2 className="text-[20px] font-black text-[var(--on-surface)]">Riwayat Terbaru</h2>
               </div>
               <Link href="/dashboard" className="text-[12px] font-black text-[var(--primary)] hover:underline uppercase tracking-widest">Dashboard</Link>
             </div>

             <div className="space-y-4">
               {absensi.slice(0, 5).map((record) => (
                 <div key={record.id} className="flex items-center justify-between p-5 rounded-2xl bg-[var(--surface-container-low)]/50 border border-[var(--outline-variant)]/20">
                    <div className="flex items-center gap-5">
                       <div className="w-10 h-10 rounded-xl bg-white border border-[var(--outline-variant)]/30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[18px] text-[var(--primary)]">calendar_month</span>
                       </div>
                       <div>
                          <p className="text-[14px] font-black text-[var(--on-surface)]">{new Date(record.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                          <p className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase tracking-wider">{record.status}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[12px] font-black text-[var(--on-surface)]">{record.check_in || '--:--'} - {record.check_out || '--:--'}</p>
                    </div>
                 </div>
               ))}
             </div>
          </section>
        </div>

        {/* Right Column: Streak & Manual Form */}
        <div className="lg:col-span-5 space-y-10">
          {/* Streak Card */}
          <section className="bg-gradient-to-br from-[#34a853] to-[#137333] rounded-[40px] p-10 text-white relative overflow-hidden shadow-xl shadow-green-100 group">
            <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
               <span className="material-symbols-outlined text-[180px]">workspace_premium</span>
            </div>
            <div className="relative z-10">
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                     <span className="material-symbols-outlined text-[28px]">local_fire_department</span>
                  </div>
                  <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">Absensi Streak</span>
               </div>
               <div>
                  <h4 className="text-[56px] font-black leading-none mb-2">{streak}</h4>
                  <p className="text-[18px] font-black tracking-tight">Hari Kehadiran</p>
                  <p className="text-[12px] opacity-70 font-medium mt-2 leading-relaxed">Terus pertahankan kedisiplinan Anda. Setiap hari adalah langkah menuju profesionalisme!</p>
               </div>
            </div>
          </section>

          {/* Manual Entry Modal-ish Section */}
          {showManualForm && (
            <section className="bg-[var(--surface-container-lowest)] rounded-[40px] p-10 border border-[var(--primary)]/30 shadow-2xl animate-[fade-in_0.3s_ease-out]">
               <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-[20px] font-black text-[var(--on-surface)]">Entri Manual</h2>
                    <p className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest mt-1">Isi riwayat atau pengajuan izin</p>
                  </div>
                  <button onClick={() => setShowManualForm(false)} className="w-10 h-10 flex items-center justify-center hover:bg-[var(--surface-container-low)] rounded-full transition-colors">
                    <span className="material-symbols-outlined">close</span>
                  </button>
               </div>

               <form onSubmit={handleManualSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest ml-1">Pilih Tanggal</label>
                    <input type="date" required max={today} value={manualForm.tanggal} onChange={e => setManualForm({...manualForm, tanggal: e.target.value})} className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)]/50 rounded-2xl px-6 py-4 text-[14px] font-bold outline-none focus:border-[var(--primary)] focus:bg-white transition-all" />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest ml-1">Status Kehadiran</label>
                    <select value={manualForm.status} onChange={e => setManualForm({...manualForm, status: e.target.value})} className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)]/50 rounded-2xl px-6 py-4 text-[14px] font-bold outline-none focus:border-[var(--primary)] focus:bg-white transition-all appearance-none">
                      <option>Hadir</option>
                      <option>Izin</option>
                      <option>Sakit</option>
                    </select>
                  </div>

                  {manualForm.status === 'Hadir' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest ml-1">Jam Masuk</label>
                        <input type="time" required value={manualForm.check_in} onChange={e => setManualForm({...manualForm, check_in: e.target.value})} className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)]/50 rounded-2xl px-6 py-4 text-[14px] font-bold outline-none focus:border-[var(--primary)] focus:bg-white transition-all" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest ml-1">Jam Pulang</label>
                        <input type="time" value={manualForm.check_out} onChange={e => setManualForm({...manualForm, check_out: e.target.value})} className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)]/50 rounded-2xl px-6 py-4 text-[14px] font-bold outline-none focus:border-[var(--primary)] focus:bg-white transition-all" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest ml-1">Alasan / Keterangan</label>
                      <textarea required placeholder="Tulis alasan izin atau sakit secara singkat..." value={manualForm.keterangan} onChange={e => setManualForm({...manualForm, keterangan: e.target.value})} className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)]/50 rounded-2xl px-6 py-4 text-[14px] font-bold outline-none focus:border-[var(--primary)] focus:bg-white transition-all resize-none h-24" />
                    </div>
                  )}

                  <button type="submit" disabled={submitting} className="w-full py-5 bg-[var(--primary)] text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all">
                    SIMPAN ENTRI
                  </button>
               </form>
            </section>
          )}

          {/* Tips Section */}
          <section className="bg-[var(--secondary-container)] p-8 rounded-[32px] border border-[var(--secondary)]/10">
             <div className="flex items-start gap-5">
               <span className="material-symbols-outlined text-[32px] text-[var(--on-secondary-container)]">lightbulb</span>
               <div>
                  <h4 className="text-[16px] font-black text-[var(--on-secondary-container)] mb-1">Tips Kehadiran</h4>
                  <p className="text-[13px] font-medium text-[var(--on-secondary-container)] opacity-80 leading-relaxed">
                    Lakukan check-in tepat waktu setiap pagi. Sistem akan mencatat keterlambatan jika dilakukan setelah jam 08.30 WIB.
                  </p>
               </div>
             </div>
          </section>
        </div>
      </div>
    </div>
  )
}
