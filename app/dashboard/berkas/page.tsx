'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { logAction } from '@/lib/audit'

type Berkas = {
  id: string
  mahasiswa_id: string
  file_type: string
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
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError
      setUploadingState(prev => ({ ...prev, [type]: 60 }))

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      const { error: dbError } = await supabase
        .from('berkas')
        .insert({
          mahasiswa_id: user.id,
          file_type: type,
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
    if (!confirm(`Hapus berkas ${file.file_type}?`)) return

    try {
      const path = file.file_url.split('/documents/')[1]
      if (path) {
        await supabase.storage.from('documents').remove([path])
      }

      const { error } = await supabase
        .from('berkas')
        .delete()
        .eq('id', file.id)

      if (error) throw error
      
      await logAction('Hapus Berkas', `Menghapus berkas: ${file.file_type}`)
      toast.success('Berkas berhasil dihapus')
      fetchBerkas()
    } catch (error: any) {
      toast.error('Gagal menghapus: ' + error.message)
    }
  }

  const completionPercentage = Math.round((berkas.length / DOCUMENT_TYPES.length) * 100)

  if (loading) return null

  return (
    <div className="space-y-10 pb-20">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 bento-card">
        <div className="space-y-2">
           <h1 className="text-[28px] font-black tracking-tight text-[var(--text-main)]">Document Center</h1>
           <p className="text-[14px] font-medium text-[var(--text-muted)]">Manage your required internship administration files</p>
        </div>
        <div className="flex items-center gap-6">
           <div className="text-right">
              <p className="text-[10px] font-black text-[var(--text-light)] uppercase tracking-widest">Completion</p>
              <p className="text-[24px] font-black text-[var(--accent)]">{completionPercentage}%</p>
           </div>
           <div className="w-16 h-16 relative">
              <svg className="w-full h-full -rotate-90">
                 <circle className="text-[var(--bg-app)]" cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="6" />
                 <circle className="text-[var(--accent)]" cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="6" strokeDasharray="175.9" strokeDashoffset={175.9 - (175.9 * completionPercentage / 100)} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                 <span className="material-symbols-outlined text-[18px] text-[var(--accent)] fill-icon">cloud_upload</span>
              </div>
           </div>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {DOCUMENT_TYPES.map((docType) => {
          const uploadedFile = berkas.find(b => b.file_type === docType)
          const isUploading = uploadingState[docType] !== undefined
          const uploadProgress = uploadingState[docType] || 0

          return (
            <div key={docType} className={`bento-card group flex flex-col justify-between min-h-[220px] transition-all ${uploadedFile ? 'bg-white' : 'bg-white border-dashed'}`}>
               <div>
                  <div className="flex justify-between items-start mb-6">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${uploadedFile ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-[var(--bg-app)] text-[var(--text-light)] group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)] shadow-sm'}`}>
                        <span className={`material-symbols-outlined ${uploadedFile ? 'fill-icon' : ''}`}>{uploadedFile ? 'task_alt' : 'description'}</span>
                     </div>
                     {uploadedFile && (
                       <button onClick={() => handleDelete(uploadedFile)} className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-light)] hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                       </button>
                     )}
                  </div>
                  <h3 className="text-[16px] font-black text-[var(--text-main)] leading-tight">{docType}</h3>
                  <p className="text-[12px] font-medium text-[var(--text-muted)] mt-1">
                     {uploadedFile ? `Uploaded on ${new Date(uploadedFile.created_at).toLocaleDateString('id-ID')}` : 'Missing document'}
                  </p>
               </div>

               <div className="mt-8">
                  {isUploading ? (
                    <div className="space-y-2">
                       <div className="h-1.5 w-full bg-[var(--bg-app)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--accent)] transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                       </div>
                       <p className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest text-center">Uploading...</p>
                    </div>
                  ) : uploadedFile ? (
                    <a href={uploadedFile.file_url} target="_blank" className="w-full py-3 bg-[var(--bg-app)] text-[var(--text-main)] rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] transition-all">
                       <span className="material-symbols-outlined text-[16px]">visibility</span>
                       View Document
                    </a>
                  ) : (
                    <label className="w-full py-3 bg-[var(--accent)] text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 cursor-pointer shadow-lg shadow-blue-100 transition-all">
                       <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                       Upload File
                       <input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], docType)} />
                    </label>
                  )}
               </div>
            </div>
          )
        })}
      </div>

      {/* Help Card */}
      <div className="bento-card bg-[var(--text-main)] text-white border-none flex items-center gap-8 py-8">
         <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-sm shrink-0">
            <span className="material-symbols-outlined text-[32px]">contact_support</span>
         </div>
         <div>
            <h4 className="text-[18px] font-black">Need assistance with files?</h4>
            <p className="text-[14px] font-medium text-white/60 mt-1 max-w-xl leading-relaxed">
               Contact our coordination team if you have issues with specific document requirements or technical errors during upload.
            </p>
         </div>
      </div>
    </div>
  )
}
