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
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#34A853] rounded-full animate-spin"></div>
        <p className="text-[#5F6368] text-sm font-medium animate-pulse">Memuat data absensi...</p>
      </div>
    </div>
  )

  return (
    <div className="pb-12 animate-[fade-in_0.7s_ease-out]">
      {/* Header Section */}
      <div className="mb-10 relative flex flex-col items-center text-center md:items-start md:text-left">
        <h1 className="text-3xl font-medium tracking-tight text-[#202124] mb-2 relative z-10 flex flex-col md:flex-row items-center gap-3">
          <Calendar className="w-8 h-8 text-[#34A853]" />
          Absensi Harian
        </h1>
        <p className="text-[#5F6368] text-base relative z-10">
          Catat kehadiran harian kamu secara disiplin
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Hadir', value: totalHadir, icon: UserCheck, color: 'text-[#34A853]', bg: 'bg-[#E6F4EA]', border: 'group-hover:border-[#34A853]' },
          { label: 'Total Izin', value: totalIzin, icon: UserX, color: 'text-[#FBBC04]', bg: 'bg-[#FEF7E0]', border: 'group-hover:border-[#FBBC04]' },
          { label: 'Total Sakit', value: totalSakit, icon: AlertCircle, color: 'text-[#EA4335]', bg: 'bg-[#FCE8E6]', border: 'group-hover:border-[#EA4335]' },
          { label: 'Kehadiran', value: `${persentase}%`, icon: CheckCircle2, color: 'text-[#1A73E8]', bg: 'bg-[#E8F0FE]', border: 'group-hover:border-[#1A73E8]' },
        ].map(s => (
          <div key={s.label} className={`group bg-white border border-gray-200 rounded-xl p-6 transition-all duration-300 hover:shadow-md ${s.border} hover:-translate-y-1`}>
            <div className="flex justify-between items-start mb-4">
              <p className="text-[#5F6368] text-sm font-medium">{s.label}</p>
              <div className={`p-2 rounded-full ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
            <p className="text-[#202124] text-3xl font-normal tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Check in/out card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 hover:shadow-sm transition-shadow relative overflow-hidden">
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h2 className="text-[#202124] text-lg font-medium flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#34A853]" />
            Absensi Hari Ini
          </h2>
          <span className="px-4 py-1.5 bg-[#F1F3F4] text-[#5F6368] rounded-full text-sm font-medium border border-gray-200">
            {today}
          </span>
        </div>

        {todayRecord ? (
          <div className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 bg-[#F8F9FA] p-6 rounded-xl border border-gray-200 text-center sm:text-left">
              <div className="flex flex-col items-center sm:items-start gap-1">
                <p className="text-xs text-[#5F6368] font-medium uppercase tracking-wider flex items-center gap-1.5"><LogIn className="w-3.5 h-3.5" /> Check-in</p>
                <p className="text-2xl font-medium text-[#202124]">{todayRecord.check_in || '-'}</p>
              </div>
              <div className="flex flex-col items-center sm:items-start gap-1">
                <p className="text-xs text-[#5F6368] font-medium uppercase tracking-wider flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5" /> Check-out</p>
                <p className="text-2xl font-medium text-[#202124]">{todayRecord.check_out || '-'}</p>
              </div>
              <div className="flex flex-col items-center sm:items-start gap-1">
                <p className="text-xs text-[#5F6368] font-medium uppercase tracking-wider">Status</p>
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                    todayRecord.status === 'Hadir' ? 'bg-[#E6F4EA] text-[#137333]' :
                    todayRecord.status === 'Izin' ? 'bg-[#FEF7E0] text-[#E37400]' :
                    'bg-[#FCE8E6] text-[#C5221F]'
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
                className="w-full sm:w-auto bg-[#EA4335] hover:bg-[#D93025] disabled:opacity-50 text-white text-sm font-medium px-8 py-3 rounded-full transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Check-out Sekarang ({nowTime})
              </button>
            )}
          </div>
        ) : (
          <div className="relative z-10 space-y-6">
            <div className="bg-[#F8F9FA] p-6 rounded-xl border border-gray-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="text-center sm:text-left">
                <p className="text-[#202124] font-medium">Anda belum melakukan absensi hari ini.</p>
                <p className="text-[#5F6368] text-sm mt-1">Silakan Check-in jika Anda hadir, atau pilih Izin/Sakit.</p>
              </div>
              <div className="flex gap-3 flex-wrap justify-center">
                <button
                  onClick={handleCheckIn}
                  disabled={submitting}
                  className="bg-[#34A853] hover:bg-[#1E8E3E] disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-full transition-all shadow-sm active:scale-95 flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Check-in ({nowTime})
                </button>
                <button
                  onClick={() => setShowIzin(!showIzin)}
                  className="bg-white hover:bg-gray-50 text-[#5F6368] text-sm font-medium px-6 py-2.5 rounded-full transition-all border border-gray-300 active:scale-95"
                >
                  Izin / Sakit
                </button>
              </div>
            </div>

            {showIzin && (
              <form onSubmit={handleIzin} className="bg-white p-6 rounded-xl border border-gray-200 animate-[fade-in_0.3s_ease-out] shadow-sm">
                <h3 className="text-[#202124] text-sm font-medium mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#FBBC04]" /> Form Izin / Sakit
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#5F6368] mb-2">Jenis Pengajuan</label>
                    <select
                      value={statusIzin}
                      onChange={e => setStatusIzin(e.target.value)}
                      className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors appearance-none"
                    >
                      <option>Izin</option>
                      <option>Sakit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5F6368] mb-2">Keterangan / Alasan</label>
                    <textarea
                      value={keterangan}
                      onChange={e => setKeterangan(e.target.value)}
                      rows={3}
                      required
                      placeholder="Tulis alasan dengan jelas..."
                      className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] resize-none transition-colors"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowIzin(false)}
                      className="px-4 py-2.5 text-sm font-medium text-[#5F6368] hover:bg-gray-100 rounded-full transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-[#1A73E8] hover:bg-[#1967D2] disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-full transition-all shadow-sm active:scale-95"
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
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-[#202124] text-lg font-medium flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#4285F4]" />
              Riwayat Absensi
            </h2>
            <p className="text-[#5F6368] text-sm mt-1">Daftar kehadiran harian Anda selama magang</p>
          </div>
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-all border ${
              showManualForm 
                ? 'bg-gray-100 text-[#5F6368] border-gray-200 hover:bg-gray-200' 
                : 'bg-white text-[#1A73E8] border-[#1A73E8] hover:bg-[#E8F0FE]'
            }`}
          >
            {showManualForm ? 'Tutup Form Manual' : <><Plus className="w-4 h-4" /> Tambah Manual</>}
          </button>
        </div>
        
        {showManualForm && (
          <form onSubmit={handleManualSubmit} className="p-6 border-b border-gray-200 bg-[#F8F9FA] animate-[fade-in_0.3s_ease-out]">
            <h3 className="text-[#1A73E8] text-sm font-medium mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Form Input Riwayat Absensi
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#5F6368] mb-2">Tanggal</label>
                <input
                  type="date"
                  required
                  max={today}
                  value={manualForm.tanggal}
                  onChange={e => setManualForm({...manualForm, tanggal: e.target.value})}
                  className="w-full bg-white text-[#202124] rounded-lg px-4 py-2.5 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6368] mb-2">Status</label>
                <select
                  value={manualForm.status}
                  onChange={e => setManualForm({...manualForm, status: e.target.value})}
                  className="w-full bg-white text-[#202124] rounded-lg px-4 py-2.5 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors appearance-none"
                >
                  <option>Hadir</option>
                  <option>Izin</option>
                  <option>Sakit</option>
                </select>
              </div>
              {manualForm.status === 'Hadir' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#5F6368] mb-2">Jam Check-in</label>
                    <input
                      type="time"
                      required
                      value={manualForm.check_in}
                      onChange={e => setManualForm({...manualForm, check_in: e.target.value})}
                      className="w-full bg-white text-[#202124] rounded-lg px-4 py-2.5 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5F6368] mb-2">Jam Check-out</label>
                    <input
                      type="time"
                      value={manualForm.check_out}
                      onChange={e => setManualForm({...manualForm, check_out: e.target.value})}
                      className="w-full bg-white text-[#202124] rounded-lg px-4 py-2.5 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors"
                    />
                  </div>
                </>
              ) : (
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-[#5F6368] mb-2">Keterangan / Alasan</label>
                  <input
                    type="text"
                    required
                    placeholder="Tulis alasan..."
                    value={manualForm.keterangan}
                    onChange={e => setManualForm({...manualForm, keterangan: e.target.value})}
                    className="w-full bg-white text-[#202124] rounded-lg px-4 py-2.5 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#1A73E8] hover:bg-[#1967D2] disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-full transition-all shadow-sm active:scale-95"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Riwayat'}
              </button>
            </div>
          </form>
        )}

        <div className="p-0 overflow-x-auto">
          {absensi.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-[#F8F9FA] rounded-full flex items-center justify-center mb-4 border border-gray-200">
                <Calendar className="w-8 h-8 text-[#9AA0A6]" />
              </div>
              <p className="text-[#202124] font-medium text-lg">Belum ada data absensi</p>
              <p className="text-[#5F6368] text-sm mt-1 max-w-sm">Catatan kehadiran Anda akan muncul di sini.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8F9FA] text-[#5F6368] text-xs font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3">Check-in</th>
                  <th className="px-6 py-3">Check-out</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {absensi.map(a => (
                  <tr key={a.id} className="hover:bg-[#F8F9FA] transition-colors group">
                    <td className="px-6 py-4 text-[#5F6368] whitespace-nowrap font-medium">{a.tanggal}</td>
                    <td className="px-6 py-4 text-[#202124]">{a.check_in || '-'}</td>
                    <td className="px-6 py-4 text-[#202124]">{a.check_out || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        a.status === 'Hadir' ? 'bg-[#E6F4EA] text-[#137333]' :
                        a.status === 'Izin' ? 'bg-[#FEF7E0] text-[#E37400]' :
                        'bg-[#FCE8E6] text-[#C5221F]'
                      }`}>
                        {a.status === 'Hadir' && <CheckCircle2 className="w-3 h-3" />}
                        {a.status === 'Izin' && <AlertCircle className="w-3 h-3" />}
                        {a.status === 'Sakit' && <UserX className="w-3 h-3" />}
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#5F6368]">
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
