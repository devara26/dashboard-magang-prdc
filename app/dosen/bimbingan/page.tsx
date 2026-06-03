'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Check,
  X,
  Calendar,
  Video,
  MapPin,
  Image as ImageIcon,
  MessageSquare,
  AlertCircle,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Student {
  id: string
  nama_lengkap: string
  nim: string
}

interface BimbinganLog {
  id: string
  mahasiswa_id: string
  dosen_id: string
  tanggal: string
  metode: string
  topik_bahasan: string
  dokumentasi_url: string | null
  catatan_koreksi: string | null
  status: string
  nama_mahasiswa?: string
  nim?: string
}

export default function DosenBimbinganPage() {
  const [logs, setLogs] = useState<BimbinganLog[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [koreksiInputs, setKoreksiInputs] = useState<Record<string, string>>({})
  const [filterStatus, setFilterStatus] = useState<string>('Menunggu')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        toast.error('Sesi dosen tidak ditemukan. Silakan login kembali.')
        return
      }

      // 1. Fetch mahasiswa bimbingan dosen aktif
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id, nama_lengkap, nim')
        .eq('role', 'mahasiswa')
        .eq('dosen_id', user.id)

      if (studentsError) throw studentsError

      // 2. Fetch log bimbingan dosen aktif
      const { data: logsData, error: logsError } = await supabase
        .from('log_bimbingan')
        .select('*')
        .eq('dosen_id', user.id)
        .order('tanggal', { ascending: false })

      if (logsError) throw logsError

      // Map data mahasiswa ke log bimbingan
      const mappedLogs = (logsData || []).map((log: any) => {
        const student = (students || []).find(s => s.id === log.mahasiswa_id)
        return {
          ...log,
          nama_mahasiswa: student ? student.nama_lengkap : 'Mahasiswa',
          nim: student ? student.nim : '-'
        }
      })

      setLogs(mappedLogs)

      // Inisialisasi input koreksi
      const inputs: Record<string, string> = {}
      mappedLogs.forEach(log => {
        inputs[log.id] = log.catatan_koreksi || ''
      })
      setKoreksiInputs(inputs)

    } catch (error: any) {
      toast.error('Gagal mengambil data: ' + error.message)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function handleValidasi(logId: string, status: 'Disetujui' | 'Ditolak') {
    setProcessingId(logId)
    const catatan = koreksiInputs[logId] || ''

    try {
      const { error } = await supabase
        .from('log_bimbingan')
        .update({
          status,
          catatan_koreksi: catatan || null
        })
        .eq('id', logId)

      if (error) throw error

      toast.success(`Log bimbingan berhasil ${status === 'Disetujui' ? 'disetujui' : 'ditolak'}`)
      
      // Update state local
      setLogs(prev => prev.map(log => {
        if (log.id === logId) {
          return { ...log, status, catatan_koreksi: catatan || null }
        }
        return log
      }))
    } catch (error: any) {
      toast.error('Gagal memperbarui status: ' + error.message)
      console.error(error)
    } finally {
      setProcessingId(null)
    }
  }

  const filteredLogs = logs.filter(log => {
    if (filterStatus === 'Semua') return true
    return log.status === filterStatus
  })

  // Loading Screen
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-slate-500 text-sm font-semibold animate-pulse">Memuat data bimbingan mahasiswa...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Validasi Bimbingan Mahasiswa</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Tinjau dan setujui laporan log bimbingan berkala mahasiswa bimbingan Anda.
          </p>
        </div>
        
        {/* Status Filter Tab */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
          {['Semua', 'Menunggu', 'Disetujui', 'Ditolak'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStatus === status
                  ? 'bg-white text-slate-850 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* --- Kartu Summary: Rapi dan Berjarak Sama --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 text-left">
            <div className="p-3 bg-blue-50 rounded-full">
               <FileText className="w-7 h-7 text-blue-600" />
            </div>
            <div>
               <p className="text-sm font-medium text-gray-500">Total Pengajuan</p>
               <p className="text-4xl font-extrabold text-gray-950">{logs.length}</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 text-left">
            <div className="p-3 bg-orange-50 rounded-full">
               <Clock className="w-7 h-7 text-orange-600" />
            </div>
            <div>
               <p className="text-sm font-medium text-gray-500">Menunggu</p>
               <p className="text-4xl font-extrabold text-gray-950">
                  {logs.filter(l => l.status === 'Menunggu').length}
               </p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 text-left">
            <div className="p-3 bg-emerald-50 rounded-full">
               <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
               <p className="text-sm font-medium text-gray-500">Disetujui</p>
               <p className="text-4xl font-extrabold text-gray-950">
                  {logs.filter(l => l.status === 'Disetujui').length}
               </p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 text-left">
            <div className="p-3 bg-red-50 rounded-full">
               <XCircle className="w-7 h-7 text-red-600" />
            </div>
            <div>
               <p className="text-sm font-medium text-gray-500">Ditolak</p>
               <p className="text-4xl font-extrabold text-gray-950">
                  {logs.filter(l => l.status === 'Ditolak').length}
               </p>
            </div>
         </div>
      </div>

      {/* --- Panel Mahasiswa: Struktur Rapi --- */}
      {filteredLogs.length > 0 ? (
         <div className="space-y-6">
            {filteredLogs.map((item) => (
               <div key={item.id} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 text-left">
                  
                  {/* Kolom Kiri: Detail Utama (Mhs, Topik, Foto) */}
                  <div className="flex-1 space-y-6">
                     <div className="flex flex-col gap-2">
                        {/* Nama & Badges: Sejajar Horizontal */}
                        <div className="flex items-center justify-between gap-4">
                           <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center font-bold text-blue-600 text-lg border">
                                 {item.nama_mahasiswa?.charAt(0) || 'M'}
                              </div>
                              <div>
                                 <p className="text-lg font-bold text-gray-950">{item.nama_mahasiswa}</p>
                                 <p className="text-sm text-gray-500">NIM: {item.nim}</p>
                              </div>
                           </div>
                           {/* Status Badges di Pojok Kanan Atas */}
                           <div className="flex items-center gap-3">
                              <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                 item.metode === 'Online'
                                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              }`}>
                                 {item.metode}
                              </span>
                              <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                 item.status === 'Disetujui'
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    : item.status === 'Ditolak'
                                       ? 'bg-red-50 text-red-600 border-red-100'
                                       : 'bg-orange-50 text-orange-600 border-orange-100'
                              }`}>
                                 {item.status}
                              </span>
                           </div>
                        </div>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                           <Calendar className="w-4 h-4 text-gray-400" />
                           {new Date(item.tanggal).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                           })}
                        </p>
                     </div>

                     <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Topik Bahasan</p>
                        <p className="text-base text-gray-800 font-medium leading-relaxed bg-gray-50 p-4 rounded-xl border whitespace-pre-wrap">{item.topik_bahasan}</p>
                     </div>

                     {item.dokumentasi_url && (
                        <div className="space-y-2">
                           <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-2">Foto Dokumentasi</p>
                           <a
                              href={item.dokumentasi_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full max-w-sm h-52 relative rounded-xl overflow-hidden border border-gray-100 group shadow-inner"
                           >
                              <img src={item.dokumentasi_url} alt="Bukti Bimbingan" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                                 <span className="text-[10px] font-bold text-white bg-slate-900/60 px-3 py-1.5 rounded-full flex items-center gap-1">
                                    <ImageIcon size={12} /> Lihat Foto Asli
                                 </span>
                              </div>
                           </a>
                        </div>
                     )}
                  </div>

                  {/* Kolom Kanan: Catatan & Tombol */}
                  <div className="md:w-96 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-100 pt-8 md:pt-0 md:pl-8 space-y-6">
                     <div className="space-y-4">
                        <label htmlFor={`catatan-${item.id}`} className="block text-sm font-semibold text-gray-700">Catatan Koreksi</label>
                        {item.status === 'Menunggu' ? (
                           <textarea
                              id={`catatan-${item.id}`}
                              value={koreksiInputs[item.id] || ''}
                              onChange={e => setKoreksiInputs({ ...koreksiInputs, [item.id]: e.target.value })}
                              placeholder="Masukkan saran perbaikan laporan..."
                              className="w-full h-44 p-4 border rounded-xl bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none resize-none leading-relaxed text-sm"
                           />
                        ) : (
                           <div className="p-4 bg-gray-50 border rounded-xl text-sm font-medium text-gray-700 leading-relaxed min-h-[176px]">
                              {item.catatan_koreksi || <span className="text-gray-400 italic">Tidak ada catatan koreksi</span>}
                           </div>
                        )}
                     </div>
                     
                     {/* Tombol Aksi: Sejajar di Bawah Kanan */}
                     {item.status === 'Menunggu' && (
                        <div className="flex items-center justify-end gap-3 mt-auto">
                           <button
                              onClick={() => handleValidasi(item.id, 'Ditolak')}
                              disabled={processingId === item.id}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-red-600 bg-red-50 hover:bg-red-100 text-sm cursor-pointer transition-colors active:scale-95 disabled:opacity-50"
                           >
                              <X className="w-4 h-4" />
                              <span>TOLAK</span>
                           </button>
                           <button
                              onClick={() => handleValidasi(item.id, 'Disetujui')}
                              disabled={processingId === item.id}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 text-sm cursor-pointer transition-colors active:scale-95 disabled:opacity-50 shadow-md"
                           >
                              <Check className="w-4 h-4" />
                              <span>SETUJUI</span>
                           </button>
                        </div>
                     )}
                  </div>

               </div>
            ))}
         </div>
      ) : (
         /* Empty State */
         <div className="bg-white border border-slate-150 py-24 rounded-3xl text-center space-y-6 max-w-xl mx-auto shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center mx-auto text-slate-400 shadow-inner border border-slate-100">
               <FileText size={36} />
            </div>
            <div className="max-w-xs mx-auto space-y-2">
               <h4 className="text-slate-800 font-bold text-base">Tidak Ada Log Bimbingan</h4>
               <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  {filterStatus === 'Semua'
                     ? 'Belum ada mahasiswa yang mengirim log bimbingan berkala.'
                     : `Tidak ada data log bimbingan dengan status "${filterStatus}".`}
               </p>
            </div>
         </div>
      )}

    </div>
  )
}
