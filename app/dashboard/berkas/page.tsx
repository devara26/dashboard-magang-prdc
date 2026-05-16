'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { logAction } from '@/lib/audit'
import {
  FileText,
  CloudUpload,
  CheckCircle2,
  Trash2,
  Eye,
  AlertCircle,
  HelpCircle,
  Clock
} from 'lucide-react'

type Berkas = {
  id: string
  mahasiswa_id: string
  document_type: string
  file_url: string
  created_at: string
}

const DOCUMENT_TYPES = [
  'Surat Lamaran',
  'CV / Resume',
  'KTM / KTP',
  'Surat Pengantar Kampus',
  'Laporan Akhir',
]

export default function BerkasPage() {
  const [berkas, setBerkas] = useState<Berkas[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingState, setUploadingState] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchBerkas()
  }, [])

  async function fetchBerkas() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('berkas')
        .select('*')
        .eq('mahasiswa_id', user.id)

      if (error) throw error
      setBerkas(data || [])
    } catch (error: any) {
      toast.error('Gagal memuat berkas: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(file: File, type: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUploadingState(prev => ({ ...prev, [type]: 10 }))

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${type}-${Math.random()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('berkas')
        .upload(filePath, file)

      if (uploadError) throw uploadError
      setUploadingState(prev => ({ ...prev, [type]: 60 }))

      const { data: { publicUrl } } = supabase.storage
        .from('berkas')
        .getPublicUrl(filePath)

      // PERBAIKAN UTAMA: Nama kolom diselaraskan menjadi 'document_type' sesuai batasan skema Supabase Anda
      const { error: dbError } = await supabase
        .from('berkas')
        .insert({
          mahasiswa_id: user.id,
          document_type: type,
          file_url: publicUrl,
        })

      if (dbError) throw dbError

      await logAction('Upload Berkas', `Mengunggah berkas: ${type}`)
      toast.success(`${type} berhasil diunggah`)
      setUploadingState(prev => {
        const next = { ...prev }
        delete next[type]
        return next
      })
      fetchBerkas()
    } catch (error: any) {
      toast.error('Gagal mengunggah: ' + error.message)
      setUploadingState(prev => {
        const next = { ...prev }
        delete next[type]
        return next
      })
    }
  }

  async function handleDelete(file: Berkas) {
    if (!confirm(`Hapus berkas ${file.document_type}?`)) return

    try {
      const path = file.file_url.split('/berkas/')[1]
      if (path) {
        await supabase.storage.from('berkas').remove([path])
      }

      const { error } = await supabase
        .from('berkas')
        .delete()
        .eq('id', file.id)

      if (error) throw error

      await logAction('Hapus Berkas', `Menghapus berkas: ${file.document_type}`)
      toast.success('Berkas berhasil dihapus')
      fetchBerkas()
    } catch (error: any) {
      toast.error('Gagal menghapus: ' + error.message)
    }
  }

  // Menyesuaikan pemetaan data list dari properti database baru
  const completionPercentage = Math.round((berkas.length / DOCUMENT_TYPES.length) * 100)

  if (loading) return null

  return (
    <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-10 neumorphic-card p-10 md:p-12">
        <div className="space-y-3 text-center md:text-left">
          <h1 className="h1-orbit text-[var(--text-main)]">Pusat Dokumen</h1>
          <p className="subtitle-orbit text-[var(--text-muted)] max-w-xl">Kelola seluruh berkas administrasi dan laporan magang Anda di satu tempat yang aman.</p>
        </div>
        <div className="flex items-center gap-10">
          <div className="text-right">
            <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Penyelesaian</p>
            <p className="h2-orbit text-[var(--accent-blue)]">{completionPercentage}%</p>
          </div>
          <div className="w-24 h-24 relative">
            <svg className="w-full h-full -rotate-90">
              <circle className="text-gray-50" cx="48" cy="48" r="40" fill="transparent" stroke="currentColor" strokeWidth="8" />
              <circle
                className="text-[var(--accent-blue)]"
                cx="48" cy="48" r="40"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray="251.32"
                strokeDashoffset={251.32 - (251.32 * completionPercentage / 100)}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[var(--accent-blue)]">
              <CloudUpload size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {DOCUMENT_TYPES.map((docType) => {
          // Menyesuaikan pencarian data list berdasarkan document_type
          const uploadedFile = berkas.find(b => b.document_type === docType)
          const isUploading = uploadingState[docType] !== undefined
          const uploadProgress = uploadingState[docType] || 0

          return (
            <div key={docType} className={`neumorphic-card p-8 group flex flex-col justify-between min-h-[260px] transition-all hover:scale-[1.02] duration-300`}>
              <div>
                <div className="flex justify-between items-start mb-8">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg ${uploadedFile ? 'accent-gradient text-white scale-110' : 'bg-gray-50 text-[var(--text-light)] group-hover:bg-blue-50 group-hover:text-[var(--accent-blue)] shadow-inner'}`}>
                    {uploadedFile ? <CheckCircle2 size={32} /> : <FileText size={32} />}
                  </div>
                  {uploadedFile && (
                    <button onClick={() => handleDelete(uploadedFile)} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <h3 className="body1-orbit font-bold text-[var(--text-main)] group-hover:text-[var(--accent-blue)] transition-colors">{docType}</h3>
                <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest mt-2 flex items-center gap-2">
                  {uploadedFile ? (
                    <>
                      <Clock size={12} />
                      Diunggah {new Date(uploadedFile.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </>
                  ) : (
                    <>
                      <AlertCircle size={12} className="text-orange-500" />
                      Belum Ada Dokumen
                    </>
                  )}
                </p>
              </div>

              <div className="mt-10">
                {isUploading ? (
                  <div className="space-y-3">
                    <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full accent-gradient transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <p className="caption-orbit font-bold text-[var(--accent-blue)] uppercase tracking-widest text-center animate-pulse">Mengunggah...</p>
                  </div>
                ) : uploadedFile ? (
                  <a
                    href={uploadedFile.file_url}
                    target="_blank"
                    className="w-full py-4 bg-gray-50 text-[var(--text-main)] rounded-2xl label-orbit font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[var(--accent-blue)] hover:text-white transition-all shadow-sm group-active:scale-95"
                  >
                    <Eye size={18} />
                    Lihat Berkas
                  </a>
                ) : (
                  <label className="w-full py-4 accent-gradient text-white rounded-2xl label-orbit font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-blue-200 cursor-pointer transition-all active:scale-95">
                    <CloudUpload size={18} />
                    Unggah File
                    <input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], docType)} />
                  </label>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Info Card */}
      <div className="neumorphic-card p-10 flex flex-col md:flex-row items-center gap-10 border-l-8 border-l-[var(--text-main)]">
        <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center text-[var(--text-main)] shrink-0 shadow-inner border border-gray-100">
          <HelpCircle size={40} />
        </div>
        <div className="text-center md:text-left">
          <h4 className="h4-orbit text-[var(--text-main)]">Butuh Bantuan Administrasi?</h4>
          <p className="body2-orbit text-[var(--text-muted)] mt-2 max-w-2xl leading-relaxed font-medium">
            Hubungi tim koordinator jika Anda memiliki kendala terkait persyaratan dokumen khusus atau mengalami kesalahan teknis saat pengunggahan berkas.
          </p>
        </div>
      </div>
    </div>
  )
}