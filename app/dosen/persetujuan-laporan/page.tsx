'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  CheckSquare, 
  Check, 
  X, 
  User, 
  Calendar, 
  Clock, 
  Square, 
  CheckSquare2, 
  FileText,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Student {
  id: string
  nama_lengkap: string
  nim: string
}

interface Kegiatan {
  id: number
  tanggal: string
  kegiatan: string
  status: string
  status_persetujuan: string
  nama_mahasiswa?: string
  nim?: string
}

export default function PersetujuanPage() {
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [studentsMap, setStudentsMap] = useState<Record<string, Student>>({})

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        toast.error('Sesi tidak ditemukan. Silakan login kembali.')
        return
      }

      // 1. Ambil mahasiswa bimbingan dosen aktif
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id, nama_lengkap, nim')
        .eq('role', 'mahasiswa')
        .eq('dosen_id', user.id)

      if (studentsError) throw studentsError

      if (!students || students.length === 0) {
        setKegiatan([])
        setLoading(false)
        return
      }

      // Buat map NIM -> Mahasiswa untuk relasi cepat
      const map: Record<string, Student> = {}
      students.forEach(s => {
        if (s.nim) map[s.nim] = s
        map[s.id] = s // Map juga UUID untuk fallback
      })
      setStudentsMap(map)

      const studentNims = students.map(s => s.nim).filter(Boolean)
      const studentIds = students.map(s => s.id).filter(Boolean)

      // 2. Ambil Kegiatan bimbingan yang 'Menunggu' persetujuan
      const orConditions = []
      if (studentNims.length > 0) {
        orConditions.push(`nim.in.(${studentNims.join(',')})`)
      }
      if (studentIds.length > 0) {
        orConditions.push(`mahasiswa_id.in.(${studentIds.join(',')})`)
      }

      const { data: kegiatanData, error: kegError } = await supabase
        .from('Kegiatan')
        .select('*')
        .eq('status_persetujuan', 'Menunggu')
        .or(orConditions.join(','))
        .order('tanggal', { ascending: false })

      if (kegError) throw kegError

      setKegiatan(kegiatanData || [])
      setSelectedIds([])
    } catch (error: any) {
      toast.error('Gagal mengambil data: ' + error.message)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  function handleSelectRow(id: number) {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  function handleSelectAll() {
    if (selectedIds.length === kegiatan.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(kegiatan.map(k => k.id))
    }
  }

  async function handleMassPersetujuan(status: 'Disetujui' | 'Ditolak') {
    if (selectedIds.length === 0) {
      toast.error('Pilih setidaknya satu jurnal terlebih dahulu.')
      return
    }

    const actionText = status === 'Disetujui' ? 'menyetujui' : 'menolak'
    if (!confirm(`Apakah Anda yakin ingin ${actionText} ${selectedIds.length} jurnal terpilih secara massal?`)) {
      return
    }

    setProcessing(true)
    try {
      const { error } = await supabase
        .from('Kegiatan')
        .update({ status_persetujuan: status })
        .in('id', selectedIds)

      if (error) throw error

      toast.success(`${selectedIds.length} jurnal berhasil ${status.toLowerCase()}`)
      await fetchData()
    } catch (error: any) {
      toast.error('Gagal memperbarui status jurnal: ' + error.message)
      console.error(error)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 border-t-[#1A73E8] text-gray-200 animate-spin" />
        <p className="text-[#5F6368] text-sm font-medium animate-pulse">Memuat daftar persetujuan jurnal...</p>
      </div>
    </div>
  )

  return (
    <div className="pb-8 animate-[fade-in_0.7s_ease-out] max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#202124] flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-[#1A73E8]" />
            Persetujuan Jurnal Massal
          </h1>
          <p className="text-[#5F6368] text-sm mt-1">Review dan kelola persetujuan jurnal harian mahasiswa bimbingan secara cepat.</p>
        </div>

        {kegiatan.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleMassPersetujuan('Ditolak')}
              disabled={processing || selectedIds.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FCE8E6] text-[#C5221F] hover:bg-[#FAD2CF] disabled:opacity-50 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <X className="w-4 h-4" />
              Tolak Terpilih ({selectedIds.length})
            </button>
            <button
              onClick={() => handleMassPersetujuan('Disetujui')}
              disabled={processing || selectedIds.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#E6F4EA] text-[#137333] hover:bg-[#CEEAD6] disabled:opacity-50 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Setujui Terpilih ({selectedIds.length})
            </button>
          </div>
        )}
      </div>

      {kegiatan.length === 0 ? (
        <div className="bg-white py-16 text-center rounded-2xl border border-gray-200/50 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-gray-100 shadow-inner">
            <FileText className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-[#202124] mb-1">Semua Jurnal Terproses</h3>
          <p className="text-[#5F6368] text-sm max-w-sm mx-auto">
            Tidak ada pengajuan jurnal baru yang berstatus Menunggu untuk mahasiswa bimbingan Anda saat ini.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-[fade-in_0.4s_ease-out]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#F8F9FA] text-[#5F6368] font-bold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">
                    <button 
                      onClick={handleSelectAll} 
                      className="text-gray-400 hover:text-[#1A73E8] transition-colors cursor-pointer"
                      title={selectedIds.length === kegiatan.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                    >
                      {selectedIds.length === kegiatan.length ? (
                        <CheckSquare2 className="w-5 h-5 text-[#1A73E8]" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4">Mahasiswa</th>
                  <th className="px-6 py-4 w-32">Tanggal</th>
                  <th className="px-6 py-4">Aktivitas Jurnal</th>
                  <th className="px-6 py-4 w-28">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {kegiatan.map((k) => {
                  const isChecked = selectedIds.includes(k.id)
                  const student = k.nim ? studentsMap[k.nim] : null
                  const displayName = student?.nama_lengkap || k.nama_mahasiswa || 'Mahasiswa'
                  const displayNim = student?.nim || k.nim || '-'

                  return (
                    <tr key={k.id} className={`hover:bg-[#F8F9FA]/80 transition-colors ${isChecked ? 'bg-blue-50/20' : ''}`}>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleSelectRow(k.id)}
                          className="text-gray-400 hover:text-[#1A73E8] transition-colors cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare2 className="w-5 h-5 text-[#1A73E8]" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 text-gray-500 shadow-sm shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-[#202124]">{displayName}</p>
                            <p className="text-xs text-[#5F6368]">{displayNim}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-[#5F6368] font-medium">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {k.tanggal}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-md whitespace-normal break-words">
                        <p className="text-[#202124] leading-relaxed text-sm font-medium">{k.kegiatan}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          k.status === 'Selesai' 
                            ? 'bg-blue-50 text-blue-600 border-blue-100' 
                            : 'bg-orange-50 text-orange-600 border-orange-100'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {k.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-4 bg-[#F8F9FA] border-t border-gray-200/50 flex justify-between items-center">
            <p className="text-xs text-[#5F6368] font-medium">
              Menampilkan <span className="font-bold text-[#202124]">{kegiatan.length}</span> pengajuan kegiatan | <span className="font-bold text-[#1A73E8]">{selectedIds.length}</span> jurnal terpilih.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
