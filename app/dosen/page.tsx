'use client'

import { useState } from 'react'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  Download, 
  Check, 
  X,
  Bell,
  Search,
  MoreHorizontal,
  ChevronRight,
  TrendingUp,
  User as UserIcon
} from 'lucide-react'
import { toast } from 'sonner'

export default function DosenBeranda() {
  const [profileName, setProfileName] = useState('Dosen')
  const [stats, setStats] = useState({ totalMahasiswa: 0, menunggu: 0, rataKehadiran: 0 })
  const [tableData, setTableData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [bukaNotif, setBukaNotif] = useState(false)
  const [daftarNotif, setDaftarNotif] = useState<any[]>([])

  const ambilNotifikasi = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('notifications')
        .select('id, message, type')
        .eq('user_id', user.id)
        .limit(5)
      
      if (data) setDaftarNotif(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchData()
    ambilNotifikasi()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Sesi tidak ditemukan. Silakan login kembali.')

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('nama_lengkap')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) console.error('Error fetching dosen profile:', profileError)
      if (profile?.nama_lengkap) setProfileName(profile.nama_lengkap)

      // Fetch students with array guard
      const { data: mhsData, error: mhsErr } = await supabase
        .from('profiles')
        .select('id, nama_lengkap, nim, tanggal_mulai, tanggal_selesai')
        .eq('role', 'mahasiswa')
        .eq('dosen_id', user.id)

      if (mhsErr) console.error('Error fetching students:', mhsErr)
      const mahasiswaList = Array.isArray(mhsData) ? mhsData : []

      // Fetch attendance
      const { data: absensiData, error: absensiError } = await supabase
        .from('absensi')
        .select('mahasiswa_id, status')

      if (absensiError) console.error('Error fetching attendance:', absensiError)
      const safeAbsensi = Array.isArray(absensiData) ? absensiData : []

      let totalHadir = 0
      let totalTarget = 0
      const mhsAttendance: Record<string, number> = {}

      mahasiswaList.forEach(m => {
        if (!m) return
        const hadir = safeAbsensi.filter(a => a && a.mahasiswa_id === m.id && a.status === 'Hadir').length || 0
        const start = m.tanggal_mulai ? new Date(m.tanggal_mulai) : null
        const end = m.tanggal_selesai ? new Date(m.tanggal_selesai) : null
        let target = 150
        if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
          target = 0
          let current = new Date(start)
          while (current <= end) {
            const day = current.getDay()
            if (day !== 0 && day !== 6) target++
            current.setDate(current.getDate() + 1)
          }
        }
        totalHadir += hadir
        totalTarget += target
        if (m.nim) {
          mhsAttendance[m.nim] = target > 0 ? Math.min(Math.round((hadir / target) * 100), 100) : 0
        }
      })

      const rataKehadiran = totalTarget > 0 ? Math.round((totalHadir / totalTarget) * 100) : 0

      // Fetch activities (Capital K table)
      const { data: kegiatanData, error: kegErr } = await supabase
        .from('Kegiatan')
        .select('id, nim, tanggal, kegiatan, status, status_persetujuan')
        .order('tanggal', { ascending: false })

      if (kegErr) console.error(kegErr.message)
      const safeKegiatan = Array.isArray(kegiatanData) ? kegiatanData : []

      const menungguCount = safeKegiatan.filter(k => k && (k.status_persetujuan === 'Menunggu' || !k.status_persetujuan)).length

      setStats({ totalMahasiswa: mahasiswaList.length, menunggu: menungguCount, rataKehadiran })

      const tableRows = mahasiswaList.map(m => {
        if (!m) return null
        const studentJournals = safeKegiatan.filter(k => k && k.nim === m.nim)
        const latestJournal = studentJournals.length > 0 ? studentJournals[0] : null
        return {
          id: m.id,
          nim: m.nim,
          nama: m.nama_lengkap,
          attendance: mhsAttendance[m.nim] || 0,
          journalId: latestJournal?.id,
          journalDesc: latestJournal?.kegiatan || 'Belum ada jurnal',
          journalStatus: latestJournal?.status_persetujuan || 'Menunggu',
          date: latestJournal?.tanggal || '-'
        }
      }).filter(Boolean)

      setTableData(tableRows)
    } catch (error: any) {
      toast.error(error.message || 'Gagal memuat data dashboard.')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(journalId: number, studentId: string) {
    try {
      const { error } = await supabase.from('Kegiatan').update({ status_persetujuan: 'Disetujui' }).eq('id', journalId)
      if (error) throw error
      await supabase.from('notifications').insert([
        { 
          user_id: studentId, 
          message: 'Jurnal magang kamu untuk hari ini telah disetujui.', 
          type: 'success' 
        }
      ])
      toast.success('Jurnal berhasil disetujui')
      fetchData()
    } catch (error: any) {
      toast.error('Gagal menyetujui jurnal: ' + (error.message || 'Terjadi kesalahan'))
    }
  }

  async function handleReject(journalId: number, studentId: string) {
    try {
      const { error } = await supabase.from('Kegiatan').update({ status_persetujuan: 'Ditolak' }).eq('id', journalId)
      if (error) throw error
      await supabase.from('notifications').insert([
        { 
          user_id: studentId, 
          message: 'Dosen pembimbing menolak jurnal kegiatan Anda. Silakan periksa kembali.', 
          type: 'warning' 
        }
      ])
      toast.success('Jurnal telah ditolak')
      fetchData()
    } catch (error: any) {
      toast.error('Gagal menolak jurnal: ' + (error.message || 'Terjadi kesalahan'))
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[999] bg-[#F0F2F5] flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-12 h-12 border-4 border-[#0066FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[#5F6368] font-bold text-lg tracking-tight">Memuat Data Bimbingan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-full accent-gradient flex items-center justify-center text-white text-3xl font-bold shadow-xl border-4 border-white">
            {(profileName ?? 'D').charAt(0)}
          </div>
          <div>
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h1 className="h1-orbit text-[var(--text-main)]">Halo, {(profileName ?? 'Dosen').split(' ')[0]}</h1>
              <span className="px-4 py-1 bg-blue-50 text-[var(--accent-blue)] text-[10px] font-bold uppercase tracking-widest rounded-full border border-blue-100">
                Dosen Pembimbing
              </span>
            </div>
            <p className="subtitle-orbit text-[var(--text-muted)] mt-1">Pantau progres dan aktivitas mahasiswa bimbingan Anda hari ini.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setBukaNotif(!bukaNotif)}
              className="neumorphic-button relative w-14 h-14 flex items-center justify-center text-[var(--text-main)] shadow-sm"
            >
              <Bell size={24} />
              <span className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            {bukaNotif && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 py-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-5 pb-3 border-b border-gray-50 flex items-center justify-between">
                  <span className="font-bold text-sm text-[var(--text-main)]">Notifikasi</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Baru</span>
                </div>
                <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto px-5">
                  {daftarNotif.length === 0 ? (
                    <div className="py-4 text-center text-xs text-gray-500">Tidak ada notifikasi.</div>
                  ) : (
                    daftarNotif.map((notif) => (
                      <div key={notif.id} className="border-b pb-2 last:border-0 py-3">
                        <p className="font-semibold text-black capitalize">{notif.type}</p>
                        <p className="text-xs mt-1 text-gray-600">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-5 pt-3 border-t border-gray-50 text-center">
                  <button 
                    onClick={() => setBukaNotif(false)}
                    className="text-xs font-bold text-[var(--accent-blue)] hover:underline"
                  >
                    Tutup Notifikasi
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="neumorphic-card p-8 flex flex-col items-center text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-[var(--accent-blue)] mb-6 shadow-inner">
            <Users size={32} />
          </div>
          <p className="label-orbit text-[var(--text-muted)] mb-1">Total Mahasiswa</p>
          <h3 className="h3-orbit text-[var(--text-main)]">{stats?.totalMahasiswa ?? 0} Orang</h3>
          <p className="caption-orbit text-[var(--text-light)] mt-2 flex items-center gap-1.5 font-bold">
            <TrendingUp size={14} className="text-emerald-500" /> Aktif Program
          </p>
        </div>

        <div className="neumorphic-card p-8 flex flex-col items-center text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 mb-6 shadow-inner">
            <Clock size={32} />
          </div>
          <p className="label-orbit text-[var(--text-muted)] mb-1">Menunggu Review</p>
          <h3 className="h3-orbit text-[var(--text-main)]">{stats?.menunggu ?? 0} Jurnal</h3>
          <p className="caption-orbit text-orange-600 font-bold mt-2 animate-pulse">Butuh Tindakan</p>
        </div>

        <div className="neumorphic-card p-8 flex flex-col items-center text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 shadow-inner">
            <CheckCircle2 size={32} />
          </div>
          <p className="label-orbit text-[var(--text-muted)] mb-1">Rata-rata Kehadiran</p>
          <h3 className="h3-orbit text-[var(--text-main)]">{stats?.rataKehadiran ?? 0}%</h3>
          <p className="caption-orbit text-[var(--text-light)] mt-2 font-bold text-emerald-600">Performa Stabil</p>
        </div>
      </div>

      {/* Main Content: Progress & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="neumorphic-card p-10 flex flex-col items-center justify-center lg:h-full shadow-sm">
           <h4 className="h4-orbit text-[var(--text-main)] mb-10">Kehadiran Global</h4>
           <div className="relative w-56 h-56 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                 <circle className="text-gray-100" cx="112" cy="112" r="95" fill="transparent" stroke="currentColor" strokeWidth="20" />
                 <circle 
                    className="text-[var(--accent-blue)]" 
                    cx="112" cy="112" r="95" 
                    fill="transparent" 
                    stroke="currentColor" 
                    strokeWidth="20" 
                    strokeDasharray="596.9" 
                    strokeDashoffset={596.9 - (596.9 * (stats?.rataKehadiran ?? 0) / 100)} 
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 2s ease-in-out' }}
                 />
              </svg>
              <div className="absolute flex flex-col items-center">
                 <span className="h1-orbit text-[var(--text-main)] leading-none">{stats?.rataKehadiran ?? 0}%</span>
                 <span className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest mt-2">Target 100%</span>
              </div>
           </div>
           <p className="body2-orbit text-[var(--text-muted)] text-center mt-10 font-medium">
              Statistik dihitung dari total akumulasi hari aktif seluruh bimbingan.
           </p>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
             <h4 className="h4-orbit text-[var(--text-main)]">Aktivitas Bimbingan</h4>
             <div className="relative md:w-64">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-light)]" />
                <input placeholder="Cari Mahasiswa..." className="w-full pl-12 pr-6 py-3 bg-white rounded-full border border-gray-100 text-[14px] font-medium outline-none focus:ring-4 focus:ring-[var(--accent-blue)]/10 transition-all shadow-sm" />
             </div>
          </div>

          <div className="neumorphic-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr>
                       <th className="px-8 py-5 caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Mahasiswa</th>
                       <th className="px-8 py-5 caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Absensi</th>
                       <th className="px-8 py-5 caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Jurnal</th>
                       <th className="px-8 py-5 caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {Array.isArray(tableData) && tableData.length === 0 ? (
                       <tr><td colSpan={4} className="px-8 py-20 text-center text-[var(--text-light)] body2-orbit italic">Belum ada mahasiswa bimbingan yang terdaftar.</td></tr>
                    ) : (
                       Array.isArray(tableData) && tableData.map(row => (
                         <tr key={row?.id ?? Math.random()} className="group hover:bg-gray-50/50 transition-colors">
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 rounded-full accent-gradient flex items-center justify-center text-white font-bold text-sm shadow-sm border-2 border-white">
                                    {(row?.nama ?? 'M').charAt(0)}
                                 </div>
                                 <div className="min-w-0">
                                    <p className="body2-orbit font-bold text-[var(--text-main)] truncate">{row?.nama ?? 'Mahasiswa'}</p>
                                    <p className="caption-orbit text-[var(--text-light)] font-medium uppercase tracking-wider">{row?.nim ?? '---'}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                 <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                    <div 
                                       className={`h-full rounded-full transition-all duration-1000 ${row?.attendance >= 80 ? 'bg-emerald-500' : row?.attendance >= 50 ? 'bg-orange-500' : 'bg-red-500'}`} 
                                       style={{ width: `${row?.attendance ?? 0}%` }} 
                                    />
                                 </div>
                                 <span className="caption-orbit font-bold text-[var(--text-main)]">{row?.attendance ?? 0}%</span>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              {row?.journalId ? (
                                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${row.journalStatus === 'Disetujui' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : row.journalStatus === 'Ditolak' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                                  {row.journalStatus || 'Menunggu'}
                                </span>
                              ) : (
                                <span className="caption-orbit text-[var(--text-light)] italic">Kosong</span>
                              )}
                           </td>
                           <td className="px-8 py-6 text-right">
                              {(row?.journalId && (!row?.journalStatus || row?.journalStatus === 'Menunggu')) ? (
                                <div className="flex items-center justify-end gap-3">
                                  <button onClick={() => handleApprove(row.journalId, row.id)} className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all shadow-sm border border-emerald-100" title="Setujui"><Check size={18} /></button>
                                  <button onClick={() => handleReject(row.journalId, row.id)} className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm border border-red-100" title="Tolak"><X size={18} /></button>
                                </div>
                              ) : (
                                <button className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--text-light)] hover:text-[var(--accent-blue)] hover:bg-white shadow-sm border border-transparent hover:border-gray-100 transition-all">
                                   <ChevronRight size={20} />
                                </button>
                              )}
                           </td>
                         </tr>
                       ))
                    )}
                  </tbody>
               </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}