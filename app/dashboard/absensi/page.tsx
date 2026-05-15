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

  const streak = absensi.filter(a => a.status === 'Hadir').length

  if (loading) return null

  return (
    <div className="space-y-10 pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-[28px] font-black tracking-tight text-[var(--text-main)]">Attendance</h1>
           <p className="text-[14px] font-medium text-[var(--text-muted)]">Track your daily presence and work hours</p>
        </div>
        <button 
          onClick={() => setShowManualForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[var(--border)] rounded-xl text-[13px] font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">edit_calendar</span>
          Manual Entry
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Status & History */}
        <div className="lg:col-span-7 space-y-10">
           {/* Check-in Card */}
           <section className="bento-card relative overflow-hidden">
              <div className="flex items-center gap-3 mb-10">
                 <div className="w-1.5 h-6 bg-[var(--accent)] rounded-full"></div>
                 <h2 className="text-[18px] font-black">Daily Status</h2>
              </div>

              <div className="space-y-12 relative">
                 <div className="absolute left-[27px] top-4 bottom-4 w-px bg-[var(--border)]"></div>
                 
                 {/* Step 1 */}
                 <div className="flex gap-8 relative z-10">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${todayRecord?.check_in ? 'bg-[var(--accent)] text-white shadow-xl shadow-blue-100' : 'bg-[var(--bg-app)] text-[var(--text-light)]'}`}>
                       <span className={`material-symbols-outlined text-[28px] ${todayRecord?.check_in ? 'fill-icon' : ''}`}>login</span>
                    </div>
                    <div className="flex-1 min-w-0 pt-2">
                       <h3 className={`text-[18px] font-black ${todayRecord?.check_in ? 'text-[var(--text-main)]' : 'text-[var(--text-light)]'}`}>Check-in</h3>
                       <p className="text-[13px] font-medium text-[var(--text-muted)] mt-1">
                          {todayRecord?.check_in ? `Registered at ${todayRecord.check_in}` : 'Pending morning registration'}
                       </p>
                    </div>
                 </div>

                 {/* Step 2 */}
                 <div className="flex gap-8 relative z-10">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${todayRecord?.check_out ? 'bg-orange-500 text-white shadow-xl shadow-orange-100' : 'bg-[var(--bg-app)] text-[var(--text-light)]'}`}>
                       <span className={`material-symbols-outlined text-[28px] ${todayRecord?.check_out ? 'fill-icon' : ''}`}>logout</span>
                    </div>
                    <div className="flex-1 min-w-0 pt-2">
                       <h3 className={`text-[18px] font-black ${todayRecord?.check_out ? 'text-[var(--text-main)]' : 'text-[var(--text-light)]'}`}>Check-out</h3>
                       <p className="text-[13px] font-medium text-[var(--text-muted)] mt-1">
                          {todayRecord?.check_out ? `Registered at ${todayRecord.check_out}` : 'Pending end of work registration'}
                       </p>
                    </div>
                 </div>
              </div>

              <div className="mt-12 pt-10 border-t border-[var(--border-light)]">
                 {!todayRecord || (todayRecord.status === 'Hadir' && !todayRecord.check_out) ? (
                    <button 
                      onClick={!todayRecord ? handleCheckIn : handleCheckOut}
                      disabled={submitting}
                      className="w-full py-5 bg-[var(--text-main)] text-white rounded-[var(--radius-lg)] text-sm font-black uppercase tracking-widest shadow-xl shadow-slate-100 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                    >
                      <span className="material-symbols-outlined text-[20px]">{!todayRecord ? 'fingerprint' : 'verified'}</span>
                      {!todayRecord ? 'CONFIRM CHECK-IN' : 'CONFIRM CHECK-OUT'}
                    </button>
                 ) : (
                    <div className="w-full py-5 bg-[var(--bg-app)] border border-[var(--border)] text-[var(--text-muted)] rounded-[var(--radius-lg)] text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3">
                       <span className="material-symbols-outlined text-[20px] fill-icon text-emerald-500">check_circle</span>
                       ATTENDANCE COMPLETE
                    </div>
                 )}
              </div>
           </section>

           {/* History Table */}
           <section className="bento-card">
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-[18px] font-black">Recent History</h2>
                 <Link href="/dashboard" className="text-[11px] font-black text-[var(--accent)] uppercase tracking-widest hover:underline">Dashboard</Link>
              </div>
              <div className="space-y-4">
                 {absensi.slice(0, 5).map((record) => (
                   <div key={record.id} className="flex items-center justify-between p-4 bg-[var(--bg-app)] rounded-[var(--radius-md)] border border-[var(--border-light)]">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[var(--text-light)] shadow-sm">
                            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                         </div>
                         <div>
                            <p className="text-[13px] font-bold text-[var(--text-main)]">{new Date(record.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                            <p className="text-[10px] font-black text-[var(--text-light)] uppercase tracking-widest">{record.status}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[13px] font-black text-[var(--text-main)]">{record.check_in || '--:--'} - {record.check_out || '--:--'}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </section>
        </div>

        {/* Sidebar: Streak & Info */}
        <div className="lg:col-span-5 space-y-10">
           {/* Streak Card */}
           <section className="bento-card bg-[var(--accent)] text-white border-none overflow-hidden relative group">
              <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                 <span className="material-symbols-outlined text-[180px]">local_fire_department</span>
              </div>
              <div className="relative z-10 space-y-8">
                 <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">Attendance Streak</span>
                    <span className="material-symbols-outlined text-white/40">auto_awesome</span>
                 </div>
                 <div>
                    <h4 className="text-[64px] font-black tracking-tighter leading-none mb-2">{streak}</h4>
                    <p className="text-[18px] font-black tracking-tight">Active Presence Days</p>
                    <p className="text-[13px] font-medium text-white/60 mt-4 leading-relaxed">
                       You've been consistent! Regular attendance is a key factor in your internship evaluation.
                    </p>
                 </div>
              </div>
           </section>

           {/* Manual Form - Mini Bento */}
           {showManualForm && (
              <section className="bento-card border-[var(--accent)]/30 animate-slide-up">
                 <div className="flex justify-between items-center mb-8">
                    <h2 className="text-[18px] font-black">Manual Entry</h2>
                    <button onClick={() => setShowManualForm(false)} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--bg-app)] rounded-full"><span className="material-symbols-outlined">close</span></button>
                 </div>
                 <form className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-[var(--text-light)] uppercase tracking-widest ml-1">Select Date</label>
                       <input type="date" value={manualForm.tanggal} className="w-full bg-[var(--bg-app)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--accent)] transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-[var(--text-light)] uppercase tracking-widest ml-1">Status</label>
                       <select value={manualForm.status} className="w-full bg-[var(--bg-app)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--accent)] transition-all appearance-none">
                          <option>Hadir</option>
                          <option>Izin</option>
                          <option>Sakit</option>
                       </select>
                    </div>
                    <button type="button" className="w-full py-4 bg-[var(--accent)] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:opacity-90">Save Entry</button>
                 </form>
              </section>
           )}

           {/* Tips */}
           <section className="bg-[var(--bg-card)] p-8 rounded-[var(--radius-lg)] border border-[var(--border)] shadow-sm flex items-start gap-5">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0 border border-amber-100">
                 <span className="material-symbols-outlined fill-icon">lightbulb</span>
              </div>
              <div>
                 <h4 className="text-[16px] font-black">Timely Presence</h4>
                 <p className="text-[13px] font-medium text-[var(--text-muted)] mt-1 leading-relaxed">
                   Make sure to check-in before 08:30 AM to maintain your performance rating.
                 </p>
              </div>
           </section>
        </div>
      </div>
    </div>
  )
}
