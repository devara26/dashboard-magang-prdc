'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  Check,
  AlertCircle,
  FileText,
  Upload,
  BookOpen,
  Users,
  Video,
  MapPin,
  Image as ImageIcon,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function BimbinganPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [dosen, setDosen] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  
  const [newBimbingan, setNewBimbingan] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    metode: 'Online',
    topik_bahasan: '',
    dokumentasi_url: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setLoading(false)
        return
      }

      // Fetch student profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        console.error('Error profile:', profileError)
      }
      setProfile(profileData || { id: user.id })

      // Fetch assigned lecturer if exists
      if (profileData?.dosen_id) {
        const { data: dosenData, error: dosenError } = await supabase
          .from('profiles')
          .select('nama_lengkap, avatar_url')
          .eq('id', profileData.dosen_id)
          .maybeSingle()
        
        if (dosenError) {
          console.error('Error fetching dosen:', dosenError)
        }
        setDosen(dosenData)
      }

      // Fetch bimbingan logs
      const { data: logsData, error: logsError } = await supabase
        .from('log_bimbingan')
        .select('*')
        .eq('mahasiswa_id', user.id)
        .order('tanggal', { ascending: false })

      if (logsError) {
        console.error('Error fetching logs:', logsError)
      }
      setLogs(logsData || [])

    } catch (error) {
      console.error('Runtime fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `bimbingan-${profile.id}-${Date.now()}.${fileExt}`

      // Upload file directly to 'dokumentasi' storage bucket
      const { error: uploadError } = await supabase.storage
        .from('dokumentasi')
        .upload(fileName, file)

      if (uploadError) {
        // Fallback to 'berkas' if 'dokumentasi' bucket is not created
        if (uploadError.message.includes('not found') || uploadError.message.includes('does not exist')) {
          console.log("Bucket 'dokumentasi' not found, trying fallback 'berkas'...")
          const { error: fallbackError } = await supabase.storage
            .from('berkas')
            .upload(fileName, file)
          
          if (fallbackError) throw fallbackError

          const { data: { publicUrl } } = supabase.storage
            .from('berkas')
            .getPublicUrl(fileName)
          
          setNewBimbingan(prev => ({ ...prev, dokumentasi_url: publicUrl }))
          setPreviewUrl(publicUrl)
          toast.success('Foto berhasil diunggah (fallback ke wadah berkas)')
        } else {
          throw uploadError
        }
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('dokumentasi')
          .getPublicUrl(fileName)

        setNewBimbingan(prev => ({ ...prev, dokumentasi_url: publicUrl }))
        setPreviewUrl(publicUrl)
        toast.success('Foto dokumentasi berhasil diunggah')
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error('Gagal mengunggah foto: ' + (error.message || 'Error tidak dikenal'))
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!profile?.dosen_id) {
      toast.error('Anda harus memiliki Dosen Pembimbing untuk mengirim bimbingan.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        mahasiswa_id: profile.id,
        dosen_id: profile.dosen_id,
        tanggal: newBimbingan.tanggal,
        metode: newBimbingan.metode,
        topik_bahasan: newBimbingan.topik_bahasan,
        dokumentasi_url: newBimbingan.dokumentasi_url || null,
        status: 'Menunggu'
      }

      const { error } = await supabase
        .from('log_bimbingan')
        .insert([payload])

      if (error) throw error

      toast.success('Log bimbingan berhasil diajukan')
      setShowModal(false)
      resetForm()
      fetchData()
    } catch (error: any) {
      toast.error('Gagal menyimpan: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setNewBimbingan({
      tanggal: new Date().toISOString().split('T')[0],
      metode: 'Online',
      topik_bahasan: '',
      dokumentasi_url: ''
    })
    setPreviewUrl(null)
  }

  // Loading Screen
  if (loading) {
    return (
      <div className="fixed inset-0 z-[999] bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 border-4 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin mx-auto shadow-sm"></div>
          <div className="space-y-2">
            <p className="text-[var(--text-main)] font-bold text-lg tracking-tight">Memuat Data Bimbingan</p>
            <p className="text-[var(--text-light)] text-sm animate-pulse">Menghubungkan ke server aman...</p>
          </div>
        </div>
      </div>
    )
  }

  const approvedLogsCount = logs.filter(log => log.status === 'Disetujui').length
  const progressPercent = Math.min((approvedLogsCount / 8) * 100, 100)

  return (
    <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div>
          <h1 className="h1-orbit text-[var(--text-main)]">Log Bimbingan</h1>
          <p className="subtitle-orbit text-[var(--text-muted)] mt-1">
            Catat dan pantau aktivitas konsultasi magang dengan dosen pembimbing.
          </p>
        </div>
        {profile?.dosen_id && (
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="neumorphic-button flex items-center gap-2 accent-gradient text-white border-none shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={20} />
            <span className="label-orbit font-bold !text-white">Tambah Bimbingan</span>
          </button>
        )}
      </div>

      {/* Warning if Dosen is not selected */}
      {!profile?.dosen_id && (
        <div className="p-8 bg-amber-50 border border-amber-200 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Belum Memiliki Dosen Pembimbing</h3>
              <p className="text-sm text-slate-600 mt-1 font-medium">
                Anda perlu menentukan dosen pembimbing terlebih dahulu di halaman Pembimbing sebelum dapat mengisi log bimbingan.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/pembimbing"
            className="px-6 py-3 bg-amber-600 text-white rounded-2xl font-bold text-sm shadow-md hover:bg-amber-700 transition-all hover:scale-[1.02]"
          >
            Pilih Dosen Pembimbing
          </Link>
        </div>
      )}

      {/* Metrics Section */}
      {profile?.dosen_id && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Target Progress Card */}
          <div className="lg:col-span-2 neumorphic-card p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="label-orbit font-bold text-[var(--text-main)]">Target Bimbingan Magang</h4>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${approvedLogsCount >= 8 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                  {approvedLogsCount >= 8 ? 'Target Tercapai' : 'Belum Memenuhi Target'}
                </span>
              </div>
              <p className="text-sm text-slate-600 font-medium">
                Setiap mahasiswa diwajibkan melakukan bimbingan minimal 8 kali selama masa magang untuk memenuhi kelayakan sidang.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {approvedLogsCount} <span className="text-sm font-medium text-slate-500">/ 8 Pertemuan Disetujui</span>
                </span>
                <span className="text-sm font-bold text-slate-700">{Math.round(progressPercent)}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Lecturer Info & Summary */}
          <div className="neumorphic-card p-8 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="label-orbit font-bold text-[var(--text-main)]">Dosen Pembimbing Anda</h4>
              {dosen ? (
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0">
                    {dosen.avatar_url ? (
                      <img src={dosen.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      dosen.nama_lengkap.charAt(0)
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-bold text-sm text-slate-800 truncate">{dosen.nama_lengkap}</p>
                    <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mt-0.5">Dosen Pembimbing</p>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic py-2">Memuat data dosen...</div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mt-6">
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 text-center">
                <p className="text-[10px] font-bold text-orange-700 uppercase tracking-widest">Menunggu</p>
                <p className="text-lg font-bold text-orange-800 mt-1">
                  {logs.filter(log => log.status === 'Menunggu').length}
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Disetujui</p>
                <p className="text-lg font-bold text-emerald-800 mt-1">{approvedLogsCount}</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-2xl p-3 text-center">
                <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest">Ditolak</p>
                <p className="text-lg font-bold text-red-800 mt-1">
                  {logs.filter(log => log.status === 'Ditolak').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {profile?.dosen_id && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Riwayat Konsultasi Bimbingan
          </h2>

          {logs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {logs.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        {new Date(item.tanggal).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Method badge */}
                        <span className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 border ${item.metode === 'Online'
                          ? 'bg-blue-50 text-blue-600 border-blue-100'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                          {item.metode === 'Online' ? <Video size={10} /> : <MapPin size={10} />}
                          {item.metode}
                        </span>

                        {/* Status badge */}
                        <span className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${item.status === 'Disetujui'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : item.status === 'Ditolak'
                            ? 'bg-red-50 text-red-600 border-red-100'
                            : 'bg-orange-50 text-orange-600 border-orange-100'
                          }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>

                    {/* Topic */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Topik Bahasan</p>
                      <p className="text-slate-800 font-semibold text-sm leading-relaxed whitespace-pre-wrap">
                        {item.topik_bahasan}
                      </p>
                    </div>

                    {/* Image Preview if uploaded */}
                    {item.dokumentasi_url && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Foto Dokumentasi</p>
                        <a
                          href={item.dokumentasi_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 aspect-video group cursor-pointer"
                        >
                          <img
                            src={item.dokumentasi_url}
                            alt="Dokumentasi Bimbingan"
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                            <span className="text-xs font-bold text-white bg-slate-900/60 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                              <ImageIcon size={14} />
                              Lihat Foto
                            </span>
                          </div>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Catatan Koreksi Dosen */}
                  {item.catatan_koreksi && (
                    <div className="mt-6 p-4 bg-amber-50/70 border border-amber-100 rounded-2xl flex gap-3 items-start text-left">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-extrabold text-amber-800 uppercase tracking-widest">Catatan Pembimbing</p>
                        <p className="text-xs text-amber-900 mt-1 font-semibold leading-relaxed">
                          {item.catatan_koreksi}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="neumorphic-card py-20 text-center space-y-6 max-w-xl mx-auto shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center mx-auto text-slate-400 shadow-inner border border-slate-100">
                <FileText size={36} />
              </div>
              <div className="max-w-xs mx-auto space-y-2">
                <h4 className="text-slate-800 font-bold text-base">Belum Ada Riwayat Bimbingan</h4>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Catat kegiatan bimbingan berkala Anda dengan pembimbing magang agar terpantau.
                </p>
              </div>
              <button
                onClick={() => { resetForm(); setShowModal(true); }}
                className="neumorphic-button accent-gradient text-white border-none px-10 shadow-blue-100"
              >
                Catat Bimbingan Pertama
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal Form Tambah Bimbingan */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-3xl p-8 relative z-10 animate-in zoom-in-95 duration-300 shadow-2xl overflow-hidden border border-slate-100">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer border border-slate-100 text-slate-500 hover:text-slate-800"
            >
              <X size={20} />
            </button>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Catat Bimbingan Baru</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">Ajukan riwayat konsultasi dengan dosen pembimbing Anda.</p>
              </div>

              <div className="space-y-6">
                {/* Tanggal */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Calendar size={15} className="text-indigo-500" />
                    Tanggal Pertemuan
                  </label>
                  <input
                    type="date"
                    required
                    value={newBimbingan.tanggal}
                    onChange={e => setNewBimbingan({ ...newBimbingan, tanggal: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-150 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-850 outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-400 transition-all shadow-inner"
                  />
                </div>

                {/* Metode */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Video size={15} className="text-indigo-500" />
                    Metode Konsultasi
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setNewBimbingan({ ...newBimbingan, metode: 'Online' })}
                      className={`py-3.5 rounded-2xl font-bold text-sm border flex items-center justify-center gap-2 transition-all cursor-pointer ${newBimbingan.metode === 'Online'
                        ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-150 hover:bg-slate-100'
                        }`}
                    >
                      <Video size={16} />
                      Online
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewBimbingan({ ...newBimbingan, metode: 'Tatap Muka' })}
                      className={`py-3.5 rounded-2xl font-bold text-sm border flex items-center justify-center gap-2 transition-all cursor-pointer ${newBimbingan.metode === 'Tatap Muka'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-150 hover:bg-slate-100'
                        }`}
                    >
                      <MapPin size={16} />
                      Tatap Muka
                    </button>
                  </div>
                </div>

                {/* Topik Bahasan */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <FileText size={15} className="text-indigo-500" />
                    Topik Bahasan
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={newBimbingan.topik_bahasan}
                    onChange={e => setNewBimbingan({ ...newBimbingan, topik_bahasan: e.target.value })}
                    placeholder="Contoh: Diskusi outline laporan bab 1-3, koreksi pengerjaan program..."
                    className="w-full bg-slate-50 border border-slate-150 rounded-2xl px-5 py-4 text-sm font-semibold text-slate-850 outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-400 transition-all shadow-inner resize-none leading-relaxed"
                  />
                </div>

                {/* Foto Dokumentasi */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <ImageIcon size={15} className="text-indigo-500" />
                    Foto Dokumentasi (Upload)
                  </label>

                  <div className="space-y-4">
                    {previewUrl ? (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-100 aspect-video bg-slate-50">
                        <img src={previewUrl} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewUrl(null)
                            setNewBimbingan(prev => ({ ...prev, dokumentasi_url: '' }))
                          }}
                          className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-slate-900/80 text-white flex items-center justify-center hover:bg-red-600 transition-all cursor-pointer shadow-md"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                        {uploading ? (
                          <>
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            <p className="text-xs text-slate-600 font-semibold">Mengunggah berkas...</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-slate-400" />
                            <p className="text-xs font-bold text-slate-700">Pilih berkas foto</p>
                            <p className="text-[10px] text-slate-500 font-medium">PNG, JPG atau JPEG maks 5MB</p>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || uploading}
                className="w-full py-4.5 accent-gradient text-white rounded-2xl label-orbit font-bold uppercase tracking-widest shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all active:scale-[0.98] cursor-pointer text-center"
              >
                {submitting ? 'Mengirim...' : 'Simpan Log Bimbingan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
