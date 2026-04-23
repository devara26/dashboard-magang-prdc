'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, Clock, CheckCircle2, UserCheck, UserX, AlertCircle, LogIn, LogOut, FileText, ChevronRight, ChevronLeft, Plus, Flame, Bell } from 'lucide-react'
import { toast } from 'sonner'
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
  const [showIzin, setShowIzin] = useState(false)
  const [keterangan, setKeterangan] = useState('')
  const [statusIzin, setStatusIzin] = useState('Izin')
  
  // Manual form state
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualForm, setManualForm] = useState({
    tanggal: '',
    check_in: '08:00',
    check_out: '17:00',
    status: 'Hadir',
    keterangan: ''
  })

  const today = new Date().toISOString().split('T')[0]
  const nowTime = new Date().toTimeString().split(' ')[0].slice(0, 5)

  useEffect(() => { fetchAbsensi() }, [])

  async function fetchAbsensi() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('absensi')
      .select('*')
      .eq('mahasiswa_id', user.id)
      .order('tanggal', { ascending: false })

    setAbsensi(data || [])
    const todayData = data?.find(a => a.tanggal === today) || null
    setTodayRecord(todayData)
    setLoading(false)
  }

  async function handleCheckIn() {
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')

      const { error } = await supabase.from('absensi').insert({
        mahasiswa_id: user.id,
        tanggal: today,
        check_in: nowTime,
        status: 'Hadir',
      })
      if (error) throw error

      toast.success('Berhasil Check-in pada ' + nowTime)
      fetchAbsensi()
    } catch (error) {
      toast.error('Gagal melakukan Check-in')
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCheckOut() {
    setSubmitting(true)
    try {
      if (!todayRecord) throw new Error('No record found')

      const { error } = await supabase
        .from('absensi')
        .update({ check_out: nowTime })
        .eq('id', todayRecord.id)
      if (error) throw error

      toast.success('Berhasil Check-out pada ' + nowTime)
      fetchAbsensi()
    } catch (error) {
      toast.error('Gagal melakukan Check-out')
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleIzin(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')

      const { error } = await supabase.from('absensi').insert({
        mahasiswa_id: user.id,
        tanggal: today,
        status: statusIzin,
        keterangan,
      })
      if (error) throw error

      toast.success(`Pengajuan ${statusIzin} berhasil dikirim`)
      setShowIzin(false)
      setKeterangan('')
      fetchAbsensi()
    } catch (error) {
      toast.error('Gagal mengirim pengajuan ' + statusIzin)
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')

      const { error } = await supabase.from('absensi').insert({
        mahasiswa_id: user.id,
        tanggal: manualForm.tanggal,
        check_in: manualForm.status === 'Hadir' ? manualForm.check_in : null,
        check_out: manualForm.status === 'Hadir' ? manualForm.check_out : null,
        status: manualForm.status,
        keterangan: manualForm.status !== 'Hadir' ? manualForm.keterangan : null,
      })
      if (error) throw error

      toast.success('Riwayat absensi berhasil ditambahkan')
      setShowManualForm(false)
      setManualForm({ tanggal: '', check_in: '08:00', check_out: '17:00', status: 'Hadir', keterangan: '' })
      fetchAbsensi()
    } catch (error) {
      toast.error('Gagal menambahkan riwayat absensi')
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  // Menghitung hari dalam seminggu untuk Tracker
  const getDaysOfWeek = () => {
    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
    const curr = new Date()
    const dayIndex = curr.getDay() === 0 ? 6 : curr.getDay() - 1 // 0 = Sen, 6 = Min
    
    return days.map((day, idx) => {
      // Dummy check for visual
      let isDone = false
      if (idx < dayIndex) isDone = true
      if (idx === dayIndex && todayRecord?.status === 'Hadir') isDone = true

      return { name: day, active: isDone, isToday: idx === dayIndex }
    })
  }

  const weekDays = getDaysOfWeek()
  
  let streak = 0
  for(let a of absensi) {
    if(a.status === 'Hadir') streak++
  }

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#34A853] rounded-full animate-spin"></div>
        <p className="text-[#5F6368] text-sm font-medium animate-pulse">Memuat data absensi...</p>
      </div>
    </div>
  )

  return (
    <div className="pb-8 animate-[fade-in_0.7s_ease-out] max-w-lg mx-auto md:max-w-none">
      
      {/* Mobile Top Controls */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/dashboard" className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm text-[#5F6368] hover:bg-gray-50 border border-gray-100">
          <Clock className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-4 text-[#202124] font-bold text-lg">
          <ChevronLeft className="w-5 h-5 text-gray-400" />
          Today
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
        <button className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm text-[#5F6368] hover:bg-gray-50 border border-gray-100 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
      </div>

      {/* Week Days Tracker */}
      <div className="flex justify-between items-center px-2 mb-6">
        {weekDays.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <span className={`text-[10px] font-bold uppercase ${d.isToday ? 'text-[#202124]' : 'text-gray-400'}`}>{d.name}</span>
            <div className={`w-10 h-12 rounded-[16px] flex items-center justify-center shadow-sm ${d.active ? 'bg-white border border-gray-100' : 'bg-[#F8F9FA] border border-transparent'}`}>
              {d.active ? (
                <div className="w-6 h-6 rounded-full bg-[#FEF7E0] flex items-center justify-center">
                  <Flame className="w-3.5 h-3.5 text-[#FBBC04] fill-[#FBBC04]" />
                </div>
              ) : d.isToday ? (
                <div className="w-6 h-6 rounded-full bg-[#E6F4EA] flex items-center justify-center">
                  <Flame className="w-3.5 h-3.5 text-[#34A853]" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <Flame className="w-3.5 h-3.5 text-gray-300" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Hero Streak Card */}
      <div className="bg-gradient-to-br from-[#E6F4EA] to-[#CEEAD6] rounded-[28px] p-6 mb-8 shadow-sm relative overflow-hidden flex items-center gap-5">
        <div className="w-[72px] h-[72px] rounded-full flex-shrink-0 relative flex items-center justify-center">
          {/* Circular progress track */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path className="text-[#A1D6B2]" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"/>
            <path className="text-[#34A853]" strokeDasharray={`${Math.min(streak * 5, 100)}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <div className="text-center z-10 flex flex-col items-center">
            <span className="text-xl font-extrabold text-[#0D652D] leading-none">{streak}</span>
            <span className="text-[10px] font-bold text-[#137333]">Days</span>
          </div>
          <div className="absolute -bottom-1 bg-white p-1 rounded-full shadow-sm">
            <Flame className="w-3 h-3 text-[#34A853] fill-[#34A853]"/>
          </div>
        </div>
        <div>
          <h2 className="text-[#0D652D] font-bold text-lg mb-1 leading-tight">You've been keeping track</h2>
          <p className="text-[#137333] text-xs font-medium mb-3">You've added an entry every day for the past week.</p>
          <span className="px-3 py-1 bg-[#A1D6B2]/40 text-[#0D652D] rounded-full text-[10px] font-bold uppercase tracking-wider">
            Longest streak: {streak} days
          </span>
        </div>
      </div>

      {/* Entries Section */}
      <div className="flex justify-between items-center mb-4 px-2">
        <h2 className="text-[#202124] font-bold text-lg">Today's entries</h2>
        <button className="text-[#9AA0A6] text-sm font-semibold flex items-center gap-1 hover:text-[#5F6368]">
          All entries <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 relative">
        <div className="space-y-6 relative mb-8">
          {/* Vertical dotted line */}
          <div className="absolute left-4 top-4 bottom-4 w-px border-l-2 border-dotted border-gray-200 z-0"></div>

          {/* Timeline Item: Check-in */}
          {todayRecord?.check_in && (
            <div className="flex gap-4 relative z-10">
              <div className="w-8 h-8 rounded-full bg-[#E8F0FE] flex items-center justify-center flex-shrink-0 ring-4 ring-white">
                <LogIn className="w-4 h-4 text-[#1A73E8]" />
              </div>
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-[#202124] font-bold">Check-in Berhasil</h3>
                </div>
                <p className="text-[#5F6368] text-xs mb-2 leading-relaxed">Kehadiran tercatat pada sistem. Mulai aktivitas magang Anda dengan semangat!</p>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{todayRecord.check_in} AM</p>
              </div>
            </div>
          )}

          {/* Timeline Item: Check-out */}
          {todayRecord?.check_out && (
            <div className="flex gap-4 relative z-10">
              <div className="w-8 h-8 rounded-full bg-[#FEF7E0] flex items-center justify-center flex-shrink-0 ring-4 ring-white">
                <LogOut className="w-4 h-4 text-[#E37400]" />
              </div>
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-[#202124] font-bold">Check-out Selesai</h3>
                </div>
                <p className="text-[#5F6368] text-xs mb-2 leading-relaxed">Terima kasih atas kerja keras hari ini. Selamat beristirahat.</p>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{todayRecord.check_out} PM</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!todayRecord && (
            <div className="flex gap-4 relative z-10 opacity-50">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 ring-4 ring-white">
                <AlertCircle className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <h3 className="text-[#202124] font-bold mb-1">Belum Absen</h3>
                <p className="text-[#5F6368] text-xs leading-relaxed">Silakan tambah entri absensi Anda hari ini.</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Button at bottom of card */}
        {(!todayRecord || (todayRecord.status === 'Hadir' && !todayRecord.check_out)) ? (
          <button 
            onClick={!todayRecord ? handleCheckIn : handleCheckOut}
            disabled={submitting}
            className="w-full bg-[#F8F9FA] hover:bg-gray-100 border border-gray-100 text-[#202124] font-bold py-3.5 rounded-full shadow-sm flex justify-center items-center gap-2 transition-colors active:scale-95 disabled:opacity-50"
          >
            {submitting ? 'Memproses...' : !todayRecord ? 'Add check-in entry' : 'Add check-out entry'}
            {!submitting && <Plus className="w-4 h-4 bg-white rounded-full p-0.5 shadow-sm" />}
          </button>
        ) : (
          <div className="w-full bg-[#F8F9FA] border border-gray-100 text-gray-400 font-bold py-3.5 rounded-full flex justify-center items-center gap-2">
            Absensi hari ini sudah lengkap <CheckCircle2 className="w-4 h-4" />
          </div>
        )}
        
        {/* Izin/Sakit Option */}
        {!todayRecord && (
          <div className="mt-4 text-center">
            <button onClick={() => setShowManualForm(!showManualForm)} className="text-[#1A73E8] text-xs font-bold hover:underline">
              Atau isi absensi manual / Izin
            </button>
          </div>
        )}

      </div>

      {showManualForm && (
        <form onSubmit={handleManualSubmit} className="mt-6 bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm animate-[fade-in_0.3s_ease-out]">
          <h3 className="text-[#202124] font-bold mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Entri Manual
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#5F6368] mb-1.5 uppercase">Tanggal</label>
              <input type="date" required max={today} value={manualForm.tanggal} onChange={e => setManualForm({...manualForm, tanggal: e.target.value})} className="w-full bg-[#F8F9FA] rounded-xl px-4 py-3 text-sm border-none focus:ring-2 focus:ring-[#1A73E8]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5F6368] mb-1.5 uppercase">Status</label>
              <select value={manualForm.status} onChange={e => setManualForm({...manualForm, status: e.target.value})} className="w-full bg-[#F8F9FA] rounded-xl px-4 py-3 text-sm border-none focus:ring-2 focus:ring-[#1A73E8]">
                <option>Hadir</option><option>Izin</option><option>Sakit</option>
              </select>
            </div>
            {manualForm.status === 'Hadir' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#5F6368] mb-1.5 uppercase">In</label>
                  <input type="time" required value={manualForm.check_in} onChange={e => setManualForm({...manualForm, check_in: e.target.value})} className="w-full bg-[#F8F9FA] rounded-xl px-4 py-3 text-sm border-none focus:ring-2 focus:ring-[#1A73E8]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5F6368] mb-1.5 uppercase">Out</label>
                  <input type="time" value={manualForm.check_out} onChange={e => setManualForm({...manualForm, check_out: e.target.value})} className="w-full bg-[#F8F9FA] rounded-xl px-4 py-3 text-sm border-none focus:ring-2 focus:ring-[#1A73E8]" />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-[#5F6368] mb-1.5 uppercase">Alasan</label>
                <input type="text" required placeholder="Tulis alasan..." value={manualForm.keterangan} onChange={e => setManualForm({...manualForm, keterangan: e.target.value})} className="w-full bg-[#F8F9FA] rounded-xl px-4 py-3 text-sm border-none focus:ring-2 focus:ring-[#1A73E8]" />
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setShowManualForm(false)} className="px-4 py-2 text-sm font-bold text-[#5F6368]">Batal</button>
            <button type="submit" disabled={submitting} className="bg-[#1A73E8] text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-sm">Simpan</button>
          </div>
        </form>
      )}

    </div>
  )
}
