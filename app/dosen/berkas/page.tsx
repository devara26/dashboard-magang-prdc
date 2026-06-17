'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Search, 
  FileSpreadsheet, 
  User, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileQuestion,
  Info,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import BerkasProgress from '@/components/BerkasProgress'

export const dynamic = 'force-dynamic'

interface StudentData {
  id: string
  nama_lengkap: string
  nim: string
  prodi: string | null
  instansi_magang: string | null
  dosen_id: string | null
  uploadedCount: number
  verifiedCount: number
  menungguCount: number
  ditolakCount: number
  statusKelengkapan: 'Lengkap' | 'Perlu Review' | 'Belum Lengkap' | 'Tidak Ada'
}

export default function MonitoringBerkasPage() {
  const [students, setStudents] = useState<StudentData[]>([])
  const [currentDosenId, setCurrentDosenId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'Semua' | 'Lengkap' | 'Perlu Review' | 'Belum Lengkap'>('Semua')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        toast.error('Sesi tidak ditemukan. Silakan login kembali.')
        setLoading(false)
        return
      }
      setCurrentDosenId(user.id)

      // 1. Fetch all students
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nama_lengkap, nim, prodi, instansi_magang, dosen_id')
        .eq('role', 'mahasiswa')

      if (profilesError) throw profilesError

      // 2. Fetch all uploads metadata to process in memory
      const { data: uploadsData, error: uploadsError } = await supabase
        .from('berkas_mahasiswa')
        .select('mahasiswa_id, status')

      if (uploadsError) throw uploadsError

      const safeUploads = uploadsData || []

      // 3. Map students and calculate stats in-memory
      const mappedStudents: StudentData[] = (profilesData || []).map((student) => {
        const studentFiles = safeUploads.filter(u => u.mahasiswa_id === student.id)
        
        const uploadedCount = studentFiles.length
        const verifiedCount = studentFiles.filter(u => u.status === 'Diverifikasi').length
        const menungguCount = studentFiles.filter(u => u.status === 'Menunggu Review').length
        const ditolakCount = studentFiles.filter(u => u.status === 'Ditolak').length

        let statusKelengkapan: StudentData['statusKelengkapan'] = 'Belum Lengkap'
        if (uploadedCount === 0) {
          statusKelengkapan = 'Tidak Ada'
        } else if (verifiedCount === 12) {
          statusKelengkapan = 'Lengkap'
        } else if (menungguCount > 0) {
          statusKelengkapan = 'Perlu Review'
        }

        return {
          id: student.id,
          nama_lengkap: student.nama_lengkap || 'Pengguna Tanpa Nama',
          nim: student.nim || '-',
          prodi: student.prodi,
          instansi_magang: student.instansi_magang,
          dosen_id: student.dosen_id,
          uploadedCount,
          verifiedCount,
          menungguCount,
          ditolakCount,
          statusKelengkapan
        }
      })

      // Sort: Lecturer's own guided students first, then alphabetically
      mappedStudents.sort((a, b) => {
        const isAGuided = a.dosen_id === user.id
        const isBGuided = b.dosen_id === user.id
        
        if (isAGuided && !isBGuided) return -1
        if (!isAGuided && isBGuided) return 1
        return a.nama_lengkap.localeCompare(b.nama_lengkap)
      })

      setStudents(mappedStudents)
    } catch (error: any) {
      console.error('Error fetching monitoring data:', error)
      toast.error('Gagal memuat data monitoring: ' + (error.message || 'Terjadi kesalahan'))
    } finally {
      setLoading(false)
    }
  }

  // Filter and search logic
  const filteredStudents = students.filter(student => {
    // Search match
    const matchesSearch = 
      student.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.nim.includes(searchQuery)

    // Filter match
    if (!matchesSearch) return false

    if (activeFilter === 'Lengkap') return student.statusKelengkapan === 'Lengkap'
    if (activeFilter === 'Perlu Review') return student.statusKelengkapan === 'Perlu Review'
    if (activeFilter === 'Belum Lengkap') {
      return student.statusKelengkapan === 'Belum Lengkap' || student.statusKelengkapan === 'Tidak Ada'
    }

    return true
  })

  // Export to Excel handler
  const handleExportExcel = () => {
    try {
      if (filteredStudents.length === 0) {
        toast.error('Tidak ada data untuk diekspor')
        return
      }

      const exportRows = filteredStudents.map((student) => ({
        'Nama Mahasiswa': student.nama_lengkap,
        'NIM': student.nim,
        'Program Studi': student.prodi || '-',
        'Instansi Magang': student.instansi_magang || '-',
        'Total Berkas Diunggah': `${student.uploadedCount}/12`,
        'Berkas Diverifikasi': `${student.verifiedCount}/12`,
        'Berkas Menunggu Review': student.menungguCount,
        'Berkas Ditolak': student.ditolakCount,
        'Status Kelengkapan': student.statusKelengkapan,
        'Bimbingan Saya': student.dosen_id === currentDosenId ? 'Ya' : 'Tidak'
      }))

      const worksheet = XLSX.utils.json_to_sheet(exportRows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Berkas Mahasiswa')

      // Auto-fit column widths
      const colWidths = [
        { wch: 25 }, // Nama
        { wch: 15 }, // NIM
        { wch: 20 }, // Prodi
        { wch: 30 }, // Instansi
        { wch: 22 }, // Diunggah
        { wch: 20 }, // Diverifikasi
        { wch: 22 }, // Menunggu
        { wch: 15 }, // Ditolak
        { wch: 18 }, // Status
        { wch: 15 }  // Bimbingan
      ]
      worksheet['!cols'] = colWidths

      XLSX.writeFile(workbook, `Rekap_Kelengkapan_Berkas_Magang_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Rekap berhasil diekspor ke Excel')
    } catch (err: any) {
      toast.error('Gagal mengekspor berkas: ' + err.message)
    }
  }

  // Calculate stats for stat cards (only for guided students)
  const guidedStudents = students.filter(s => s.dosen_id === currentDosenId)
  const totalGuided = guidedStudents.length
  const completedGuided = guidedStudents.filter(s => s.statusKelengkapan === 'Lengkap').length
  const reviewNeededGuided = guidedStudents.filter(s => s.statusKelengkapan === 'Perlu Review').length

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-gray-50/50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 font-bold text-sm tracking-tight animate-pulse">Memuat Data Kelengkapan Berkas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left bg-white p-8 rounded-3xl border border-gray-200/60 shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Kelengkapan Berkas Mahasiswa</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Verifikasi berkas wajib administrasi magang mahasiswa bimbingan Anda.</p>
        </div>
        <button
          onClick={handleExportExcel}
          className="w-full md:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2.5 shadow-sm shadow-emerald-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <FileSpreadsheet size={18} />
          Export Rekap Excel
        </button>
      </div>

      {/* Stats Cards (Guidance Focus) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200/60 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Users size={28} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Bimbingan Saya</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{totalGuided} Mahasiswa</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200/60 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Bimbingan Lengkap</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{completedGuided} / {totalGuided} Mahasiswa</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200/60 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Clock size={28} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Perlu Review Berkas</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{reviewNeededGuided} Mahasiswa</h3>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 md:space-y-0 md:flex items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-2 md:pb-0 scrollbar-none">
          {(['Semua', 'Lengkap', 'Perlu Review', 'Belum Lengkap'] as const).map((filter) => {
            const isActive = activeFilter === filter
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                    : 'bg-gray-50 text-gray-650 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {filter}
              </button>
            )
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-450 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama atau NIM..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/70 border-b border-gray-150 border-gray-200/70 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4.5">Nama Mahasiswa</th>
                <th className="px-6 py-4.5">NIM</th>
                <th className="px-6 py-4.5">Progress Berkas</th>
                <th className="px-6 py-4.5">Status</th>
                <th className="px-6 py-4.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-750 text-gray-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-400 text-xs italic">
                    <Info size={24} className="mx-auto mb-2 opacity-30 text-gray-500" />
                    Tidak ada mahasiswa ditemukan.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isGuided = student.dosen_id === currentDosenId

                  // Status details
                  let statusBadgeClass = 'bg-red-50 text-red-600 border-red-100'
                  let statusIcon = <AlertCircle size={12} />

                  if (student.statusKelengkapan === 'Lengkap') {
                    statusBadgeClass = 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    statusIcon = <CheckCircle2 size={12} />
                  } else if (student.statusKelengkapan === 'Perlu Review') {
                    statusBadgeClass = 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                    statusIcon = <Clock size={12} />
                  } else if (student.statusKelengkapan === 'Tidak Ada') {
                    statusBadgeClass = 'bg-gray-50 text-gray-400 border-gray-200'
                    statusIcon = <FileQuestion size={12} />
                  }

                  return (
                    <tr key={student.id} className="hover:bg-gray-50/40 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-extrabold flex items-center justify-center text-sm shadow-sm border border-blue-100">
                            {student.nama_lengkap.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-900">{student.nama_lengkap}</p>
                              {isGuided && (
                                <span className="bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                  Bimbingan Saya
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold tracking-tight mt-0.5 uppercase">
                              {student.prodi || 'Program Studi'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-gray-550 text-gray-500 font-semibold">{student.nim}</td>
                      <td className="px-6 py-5">
                        <div className="w-48">
                          <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-1">
                            <span>{student.verifiedCount}/12 Berkas</span>
                            <span>{Math.round((student.verifiedCount / 12) * 100)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                student.verifiedCount === 12
                                  ? 'bg-emerald-500'
                                  : student.statusKelengkapan === 'Perlu Review'
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${(student.verifiedCount / 12) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusBadgeClass}`}>
                          {statusIcon}
                          {student.statusKelengkapan}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link
                          href={`/dosen/berkas/${student.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-50 group-hover:translate-x-0.5"
                        >
                          <Eye size={14} />
                          Detail
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
