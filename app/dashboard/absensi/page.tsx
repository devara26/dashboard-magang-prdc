'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, Clock, CheckCircle2, UserCheck, UserX, AlertCircle, LogIn, LogOut, FileText, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'

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

  const totalHadir = absensi.filter(a => a.status === 'Hadir').length
  const totalIzin = absensi.filter(a => a.status === 'Izin').length
  const totalSakit = absensi.filter(a => a.status === 'Sakit').length
  const persentase = absensi.length > 0 ? Math.round((totalHadir / absensi.length) * 100) : 0

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-cyan-500 rounded-full animate-spin"></div>
        <p className="text-zinc-500 text-sm font-medium animate-pulse">Memuat data absensi...</p>
      </div>
    </div>
  )

  return (
    <div className="pb-12 animate-[fade-in_0.7s_ease-out]">
      {/* Header Section */}
      <div className="mb-10 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2 relative z-10 flex items-center gap-3">
          <Calendar className="w-8 h-8 text-emerald-400" />
          Absensi <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Harian</span>
        </h1>
        <p className="text-zinc-400 text-base relative z-10">
          Catat kehadiran harian kamu secara disiplin
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Hadir', value: totalHadir, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'group-hover:border-emerald-500/50' },
          { label: 'Total Izin', value: totalIzin, icon: UserX, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'group-hover:border-yellow-500/50' },
          { label: 'Total Sakit', value: totalSakit, icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'group-hover:border-rose-500/50' },
          { label: 'Kehadiran', value: `${persentase}%`, icon: CheckCircle2, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'group-hover:border-cyan-500/50' },
        ].map(s => (
          <div key={s.label} className={`group bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6 transition-all duration-300 hover:bg-zinc-900 ${s.border} hover:shadow-lg hover:-translate-y-1`}>
            <div className="flex justify-between items-start mb-4">
              <p className="text-zinc-400 text-sm font-medium">{s.label}</p>
              <div className={`p-2 rounded-xl ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
            <p className={`text-3xl font-bold tracking-tight ${s.color === 'text-cyan-400' ? 'text-white' : 'text-white'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Check in/out card */}
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6 mb-8 hover:border-zinc-700/50 transition-colors relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h2 className="text-white text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            Absensi Hari Ini
          </h2>
          <span className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-lg text-sm border border-zinc-700 font-medium">
            {today}
          </span>
        </div>

        {todayRecord ? (
          <div className="space-y-6 relative z-10">
            <div className="grid grid-cols-3 gap-6 bg-zinc-950/50 p-6 rounded-xl border border-zinc-800/50">
              <div className="flex flex-col gap-1">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-1.5"><LogIn className="w-3.5 h-3.5" /> Check-in</p>
                <p className="text-2xl font-semibold text-white">{todayRecord.check_in || '-'}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5" /> Check-out</p>
                <p className="text-2xl font-semibold text-white">{todayRecord.check_out || '-'}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Status</p>
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${
                    todayRecord.status === 'Hadir' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    todayRecord.status === 'Izin' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                    'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {todayRecord.status === 'Hadir' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {todayRecord.status === 'Izin' && <AlertCircle className="w-3.5 h-3.5" />}
                    {todayRecord.status === 'Sakit' && <UserX className="w-3.5 h-3.5" />}
                    {todayRecord.status}
                  </span>
                </div>
              </div>
            </div>
            
            {todayRecord.status === 'Hadir' && !todayRecord.check_out && (
              <button
                onClick={handleCheckOut}
                disabled={submitting}
                className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 disabled:opacity-50 text-white text-sm font-medium px-8 py-3 rounded-xl transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 active:scale-95 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Check-out Sekarang ({nowTime})
              </button>
            )}
          </div>
        ) : (
          <div className="relative z-10 space-y-6">
            <div className="bg-zinc-950/50 p-6 rounded-xl border border-zinc-800/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="text-center sm:text-left">
                <p className="text-zinc-300 font-medium">Anda belum melakukan absensi hari ini.</p>
                <p className="text-zinc-500 text-sm mt-1">Silakan Check-in jika Anda hadir, atau pilih Izin/Sakit.</p>
              </div>
              <div className="flex gap-3 flex-wrap justify-center">
                <button
                  onClick={handleCheckIn}
                  disabled={submitting}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 active:scale-95 flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Check-in ({nowTime})
                </button>
                <button
                  onClick={() => setShowIzin(!showIzin)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-all border border-zinc-700 hover:border-zinc-600 active:scale-95"
                >
                  Izin / Sakit
                </button>
              </div>
            </div>

            {showIzin && (
              <form onSubmit={handleIzin} className="bg-zinc-950/50 p-6 rounded-xl border border-zinc-800/50 animate-[fade-in_0.3s_ease-out]">
                <h3 className="text-white text-sm font-medium mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-yellow-400" /> Form Izin / Sakit
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Jenis Pengajuan</label>
                    <select
                      value={statusIzin}
                      onChange={e => setStatusIzin(e.target.value)}
                      className="w-full bg-zinc-900 text-white rounded-xl px-4 py-3 text-sm border border-zinc-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                    >
                      <option>Izin</option>
                      <option>Sakit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Keterangan / Alasan</label>
                    <textarea
                      value={keterangan}
                      onChange={e => setKeterangan(e.target.value)}
                      rows={3}
                      required
                      placeholder="Tulis alasan dengan jelas..."
                      className="w-full bg-zinc-900 text-white rounded-xl px-4 py-3 text-sm border border-zinc-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none transition-colors"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowIzin(false)}
                      className="px-4 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-yellow-500/20 active:scale-95"
                    >
                      {submitting ? 'Menyimpan...' : 'Kirim Pengajuan'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Riwayat Table */}
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl overflow-hidden hover:border-zinc-700/50 transition-colors">
        <div className="p-6 border-b border-zinc-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-white text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-zinc-400" />
              Riwayat Absensi
            </h2>
            <p className="text-zinc-500 text-sm mt-1">Daftar kehadiran harian Anda selama magang</p>
          </div>
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all border ${
              showManualForm 
                ? 'bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
            }`}
          >
            {showManualForm ? 'Tutup Form Manual' : <><Plus className="w-4 h-4" /> Tambah Manual</>}
          </button>
        </div>
        
        {showManualForm && (
          <form onSubmit={handleManualSubmit} className="p-6 border-b border-zinc-800/50 bg-zinc-950/30 animate-[fade-in_0.3s_ease-out]">
            <h3 className="text-emerald-400 text-sm font-medium mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Form Input Riwayat Absensi
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tanggal</label>
                <input
                  type="date"
                  required
                  max={today}
                  value={manualForm.tanggal}
                  onChange={e => setManualForm({...manualForm, tanggal: e.target.value})}
                  className="w-full bg-zinc-900 text-white rounded-xl px-4 py-2.5 text-sm border border-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
                <select
                  value={manualForm.status}
                  onChange={e => setManualForm({...manualForm, status: e.target.value})}
                  className="w-full bg-zinc-900 text-white rounded-xl px-4 py-2.5 text-sm border border-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                >
                  <option>Hadir</option>
                  <option>Izin</option>
                  <option>Sakit</option>
                </select>
              </div>
              {manualForm.status === 'Hadir' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Jam Check-in</label>
                    <input
                      type="time"
                      required
                      value={manualForm.check_in}
                      onChange={e => setManualForm({...manualForm, check_in: e.target.value})}
                      className="w-full bg-zinc-900 text-white rounded-xl px-4 py-2.5 text-sm border border-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Jam Check-out</label>
                    <input
                      type="time"
                      value={manualForm.check_out}
                      onChange={e => setManualForm({...manualForm, check_out: e.target.value})}
                      className="w-full bg-zinc-900 text-white rounded-xl px-4 py-2.5 text-sm border border-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                </>
              ) : (
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Keterangan / Alasan</label>
                  <input
                    type="text"
                    required
                    placeholder="Tulis alasan..."
                    value={manualForm.keterangan}
                    onChange={e => setManualForm({...manualForm, keterangan: e.target.value})}
                    className="w-full bg-zinc-900 text-white rounded-xl px-4 py-2.5 text-sm border border-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-all shadow-lg active:scale-95"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Riwayat'}
              </button>
            </div>
          </form>
        )}

        <div className="p-0 overflow-x-auto">
          {absensi.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4 border border-zinc-700/50">
                <Calendar className="w-8 h-8 text-zinc-500" />
              </div>
              <p className="text-zinc-300 font-medium text-lg">Belum ada data absensi</p>
              <p className="text-zinc-500 text-sm mt-1 max-w-sm">Catatan kehadiran Anda akan muncul di sini.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Tanggal</th>
                  <th className="px-6 py-4 font-medium">Check-in</th>
                  <th className="px-6 py-4 font-medium">Check-out</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {absensi.map(a => (
                  <tr key={a.id} className="hover:bg-zinc-800/20 transition-colors group">
                    <td className="px-6 py-4 text-zinc-400 whitespace-nowrap font-medium">{a.tanggal}</td>
                    <td className="px-6 py-4 text-zinc-200">{a.check_in || '-'}</td>
                    <td className="px-6 py-4 text-zinc-200">{a.check_out || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                        a.status === 'Hadir' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        a.status === 'Izin' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {a.status === 'Hadir' && <CheckCircle2 className="w-3 h-3" />}
                        {a.status === 'Izin' && <AlertCircle className="w-3 h-3" />}
                        {a.status === 'Sakit' && <UserX className="w-3 h-3" />}
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      <span className="line-clamp-1">{a.keterangan || '-'}</span>
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