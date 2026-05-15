'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, CheckCircle2, Clock, Calendar, Download, Check, X } from 'lucide-react'
import { toast } from 'sonner'

export default function DosenBeranda() {
  const [profileName, setProfileName] = useState('Dosen')
  const [stats, setStats] = useState({ totalMahasiswa: 0, menunggu: 0, rataKehadiran: 0 })
  const [tableData, setTableData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('nama_lengkap').eq('id', user.id).single()
        if (profile?.nama_lengkap) setProfileName(profile.nama_lengkap)
      }

      // 1. Total Mahasiswa (Hanya yang dibimbing oleh dosen ini)
      const { data: mhsData, error: mhsErr } = await supabase
        .from('profiles')
        .select('id, nama_lengkap, nim, tanggal_mulai, tanggal_selesai')
        .eq('role', 'mahasiswa')
        .eq('dosen_id', user?.id)
      
      if (mhsErr) throw mhsErr
      const mahasiswaList = mhsData || []

      // 2. Kehadiran
      const { data: absensiData } = await supabase.from('absensi').select('mahasiswa_id, status')
      
      let totalHadir = 0
      let totalTarget = 0

      const mhsAttendance: Record<string, number> = {}
      
      mahasiswaList.forEach(m => {
        const hadir = absensiData?.filter(a => a.mahasiswa_id === m.id && a.status === 'Hadir').length || 0
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
        mhsAttendance[m.nim] = target > 0 ? Math.min(Math.round((hadir / target) * 100), 100) : 0
      })

      const rataKehadiran = totalTarget > 0 ? Math.round((totalHadir / totalTarget) * 100) : 0

      // 3. Kegiatan
      const { data: kegiatanData } = await supabase
        .from('Kegiatan')
        .select('id, nim, tanggal, kegiatan, status, status_persetujuan')
        .order('tanggal', { ascending: false })
      
      const kegiatanList = kegiatanData || []
      const menungguCount = kegiatanList.filter(k => k.status_persetujuan === 'Menunggu' || !k.status_persetujuan).length

      setStats({
        totalMahasiswa: mahasiswaList.length,
        menunggu: menungguCount,
        rataKehadiran
      })

      const tableRows = mahasiswaList.map(m => {
        const studentJournals = kegiatanList.filter(k => k.nim === m.nim)
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
      })

      setTableData(tableRows)

    } catch (error: any) {
      toast.error('Gagal memuat data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(journalId: number) {
    try {
      const { error } = await supabase.from('Kegiatan').update({ status_persetujuan: 'Disetujui' }).eq('id', journalId)
      if (error) throw error
      toast.success('Jurnal disetujui')
      fetchData()
    } catch (error: any) {
      toast.error('Gagal menyetujui: ' + error.message)
    }
  }

  async function handleReject(journalId: number) {
    try {
      const { error } = await supabase.from('Kegiatan').update({ status_persetujuan: 'Ditolak' }).eq('id', journalId)
      if (error) throw error
      toast.success('Jurnal ditolak')
      fetchData()
    } catch (error: any) {
      toast.error('Gagal menolak: ' + error.message)
    }
  }

  function downloadCSV() {
    const headers = ['Nama Mahasiswa', 'NIM', 'Persentase Kehadiran', 'Status Jurnal Terakhir', 'Tanggal Jurnal']
    const csvContent = [
      headers.join(','),
      ...tableData.map(row => 
        `"${row.nama}","${row.nim}","${row.attendance}%","${row.journalStatus}","${row.date}"`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'Data_Mahasiswa_Magang.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1A73E8] rounded-full animate-spin"></div>
        <p className="text-[#5F6368] text-sm font-medium animate-pulse">Memuat dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="pb-8 animate-[fade-in_0.7s_ease-out] max-w-lg mx-auto md:max-w-none">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#202124]">Selamat datang, {profileName}</h1>
        <p className="text-[#5F6368] text-sm mt-1">Berikut adalah ringkasan aktivitas mahasiswa bimbingan Anda.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#E8F0FE] rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-[#1A73E8]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#5F6368]">Total Mahasiswa</p>
              <h2 className="text-3xl font-bold text-[#202124]">{stats.totalMahasiswa}</h2>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#FEF7E0] rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-[#E37400]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#5F6368]">Menunggu Persetujuan</p>
              <h2 className="text-3xl font-bold text-[#202124]">{stats.menunggu}</h2>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#E6F4EA] rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-[#137333]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#5F6368]">Rata-rata Kehadiran</p>
              <h2 className="text-3xl font-bold text-[#202124]">{stats.rataKehadiran}%</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-[#202124] text-lg font-bold">Status Mahasiswa & Jurnal Terakhir</h3>
          <button 
            onClick={downloadCSV}
            className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-[#5F6368] hover:bg-gray-50 px-4 py-2 rounded-full text-sm font-medium transition-colors w-full md:w-auto"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#F8F9FA] text-[#5F6368] font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Nama Mahasiswa</th>
                <th className="px-6 py-4">Kehadiran</th>
                <th className="px-6 py-4">Status Jurnal Terakhir</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#5F6368]">Belum ada data mahasiswa</td>
                </tr>
              ) : (
                tableData.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#202124]">{row.nama}</p>
                      <p className="text-xs text-[#5F6368]">{row.nim}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${row.attendance >= 80 ? 'bg-[#137333]' : row.attendance >= 50 ? 'bg-[#FBBC04]' : 'bg-[#EA4335]'}`} 
                            style={{ width: `${row.attendance}%` }}
                          />
                        </div>
                        <span className="font-medium text-[#202124]">{row.attendance}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {row.journalId ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          row.journalStatus === 'Disetujui' ? 'bg-[#E6F4EA] text-[#137333]' :
                          row.journalStatus === 'Ditolak' ? 'bg-[#FCE8E6] text-[#C5221F]' :
                          'bg-[#FEF7E0] text-[#E37400]'
                        }`}>
                          {row.journalStatus || 'Menunggu'}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Belum ada jurnal</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(row.journalId && (!row.journalStatus || row.journalStatus === 'Menunggu')) ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleApprove(row.journalId)}
                            className="p-1.5 bg-[#E6F4EA] text-[#137333] hover:bg-[#CEEAD6] rounded-md transition-colors"
                            title="Setujui"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleReject(row.journalId)}
                            className="p-1.5 bg-[#FCE8E6] text-[#C5221F] hover:bg-[#FAD2CF] rounded-md transition-colors"
                            title="Tolak"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
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
  )
}
