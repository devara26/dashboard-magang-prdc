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
  const [filterStatus, setFilterStatus] = useState<string>('Semua')

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl border border-slate-150 p-6 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Pengajuan</span>
          <span className="text-3xl font-black text-slate-800 mt-2">{logs.length}</span>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-3xl p-6 flex flex-col justify-between">
          <span className="text-[10px] font-extrabold text-orange-700 uppercase tracking-widest flex items-center gap-1.5">
            <Clock size={12} /> Menunggu
          </span>
          <span className="text-3xl font-black text-orange-850 mt-2">
            {logs.filter(l => l.status === 'Menunggu').length}
          </span>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex flex-col justify-between">
          <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
            <CheckCircle2 size={12} /> Disetujui
          </span>
          <span className="text-3xl font-black text-emerald-850 mt-2">
            {logs.filter(l => l.status === 'Disetujui').length}
          </span>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex flex-col justify-between">
          <span className="text-[10px] font-extrabold text-red-700 uppercase tracking-widest flex items-center gap-1.5">
            <XCircle size={12} /> Ditolak
          </span>
          <span className="text-3xl font-black text-red-850 mt-2">
            {logs.filter(l => l.status === 'Ditolak').length}
          </span>
        </div>
      </div>

      {/* List content */}
      {filteredLogs.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {filteredLogs.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 flex flex-col lg:flex-row justify-between gap-8 shadow-sm hover:shadow-md hover:scale-[1.005] transition-all duration-300"
            >
              {/* Left Content (Mahasiswa details & topic) */}
              <div className="flex-1 space-y-5 text-left">
                {/* Identity & Header info */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-4 py-1.5 bg-slate-100 rounded-2xl text-xs font-bold text-slate-800">
                    {item.nama_mahasiswa}
                  </span>
                  <span className="px-3.5 py-1.5 bg-slate-50 border border-slate-200/50 rounded-2xl text-xs font-medium text-slate-500">
                    NIM: {item.nim}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400 text-xs font-medium ml-2">
                    <Calendar size={14} />
                    {new Date(item.tanggal).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                {/* Topic */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Topik Bahasan</h4>
                  <p className="text-slate-800 font-bold text-sm leading-relaxed whitespace-pre-wrap">
                    {item.topik_bahasan}
                  </p>
                </div>

                {/* Documentation thumbnail */}
                {item.dokumentasi_url && (
                  <div className="space-y-2 max-w-sm">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Foto Dokumentasi</h4>
                    <a
                      href={item.dokumentasi_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative rounded-2xl overflow-hidden border border-slate-100 aspect-video bg-slate-50 group cursor-pointer"
                    >
                      <img src={item.dokumentasi_url} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                        <span className="text-[10px] font-bold text-white bg-slate-900/60 px-3 py-1.5 rounded-full flex items-center gap-1">
                          <ImageIcon size={12} /> Lihat Foto Asli
                        </span>
                      </div>
                    </a>
                  </div>
                )}
              </div>

              {/* Right Content (Correction note & Actions) */}
              <div className="w-full lg:w-96 flex flex-col justify-between gap-6 border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-8 text-left">
                {/* Method & Current Status info */}
                <div className="flex items-center justify-between">
                  <span className={`px-3.5 py-1.5 rounded-2xl text-[10px] font-extrabold uppercase tracking-wider border flex items-center gap-1 ${
                    item.metode === 'Online'
                      ? 'bg-blue-50 text-blue-600 border-blue-100'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}>
                    {item.metode === 'Online' ? <Video size={10} /> : <MapPin size={10} />}
                    {item.metode}
                  </span>

                  <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-extrabold uppercase tracking-wider border ${
                    item.status === 'Disetujui'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : item.status === 'Ditolak'
                        ? 'bg-red-50 text-red-600 border-red-100'
                        : 'bg-orange-50 text-orange-600 border-orange-100'
                  }`}>
                    {item.status}
                  </span>
                </div>

                {/* Koreksi input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <MessageSquare size={12} /> Catatan Koreksi
                  </label>
                  <textarea
                    rows={2}
                    value={koreksiInputs[item.id] || ''}
                    onChange={e => setKoreksiInputs({ ...koreksiInputs, [item.id]: e.target.value })}
                    placeholder="Masukkan catatan perbaikan atau feedback bimbingan..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-400 transition-all resize-none shadow-inner leading-relaxed"
                  />
                </div>

                {/* Validation Actions */}
                <div className="flex gap-4">
                  <button
                    onClick={() => handleValidasi(item.id, 'Ditolak')}
                    disabled={processingId === item.id}
                    className="flex-1 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    <X size={16} /> Tolak
                  </button>
                  <button
                    onClick={() => handleValidasi(item.id, 'Disetujui')}
                    disabled={processingId === item.id}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-100"
                  >
                    <Check size={16} /> Setujui
                  </button>
                </div>
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
