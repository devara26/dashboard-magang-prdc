'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const REQUIRED_DOCUMENTS = [
  'Surat Permohonan Magang dari Kampus',
  'Surat Penerimaan dari Tempat Magang',
  'Surat Pelepasan dari Tempat Magang',
  'Surat Rekognisi Magang',
  'Form Penilaian Magang',
  'Sertifikat Magang',
  'Form Monev Individu',
  'Form Monev Kelompok'
]

type Berkas = {
  id: string
  document_type: string
  file_url: string
  file_name: string
  file_size: number
  uploaded_at: string
}

export default function BerkasPage() {
  const [berkasData, setBerkasData] = useState<Berkas[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [uploadingState, setUploadingState] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data, error } = await supabase
        .from('berkas')
        .select('*')
        .eq('mahasiswa_id', user.id)

      if (error) throw error
      setBerkasData(data || [])
    } catch (error: any) {
      toast.error('Gagal memuat berkas: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  function getBerkas(docType: string) {
    return berkasData.find(b => b.document_type === docType)
  }

  async function handleFileUpload(file: File, docType: string) {
    if (!userId) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 10MB')
      return
    }
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format file harus PDF, JPG, atau PNG')
      return
    }

    setUploadingState(prev => ({ ...prev, [docType]: 10 }))

    try {
      const timestamp = new Date().getTime()
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `${userId}/${docType.replace(/\s+/g, '_')}/${timestamp}_${cleanFileName}`

      setUploadingState(prev => ({ ...prev, [docType]: 40 }))

      const { error: uploadError } = await supabase.storage
        .from('berkas')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      setUploadingState(prev => ({ ...prev, [docType]: 80 }))

      const { data: { publicUrl } } = supabase.storage
        .from('berkas')
        .getPublicUrl(filePath)

      const existing = getBerkas(docType)
      if (existing) {
        const { error: dbError } = await supabase
          .from('berkas')
          .update({
            file_url: publicUrl,
            file_name: file.name,
            file_size: file.size,
            uploaded_at: new Date().toISOString()
          })
          .eq('id', existing.id)
        if (dbError) throw dbError
      } else {
        const { error: dbError } = await supabase
          .from('berkas')
          .insert({
            mahasiswa_id: userId,
            document_type: docType,
            file_url: publicUrl,
            file_name: file.name,
            file_size: file.size,
            uploaded_at: new Date().toISOString()
          })
        if (dbError) throw dbError
      }

      setUploadingState(prev => ({ ...prev, [docType]: 100 }))
      toast.success(`${docType} berhasil diunggah`)
      fetchData()
    } catch (error: any) {
      toast.error(`Gagal mengunggah ${docType}: ` + error.message)
    } finally {
      setTimeout(() => {
        setUploadingState(prev => {
          const newState = { ...prev }
          delete newState[docType]
          return newState
        })
      }, 500)
    }
  }

  async function handleDelete(berkas: Berkas) {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${berkas.document_type}?`)) return

    try {
      const urlParts = berkas.file_url.split('/berkas/')
      if (urlParts.length > 1) {
        const pathToRemove = urlParts[1]
        await supabase.storage.from('berkas').remove([pathToRemove])
      }

      const { error } = await supabase.from('berkas').delete().eq('id', berkas.id)
      if (error) throw error

      toast.success(`${berkas.document_type} berhasil dihapus`)
      fetchData()
    } catch (error: any) {
      toast.error('Gagal menghapus berkas: ' + error.message)
    }
  }

  const uploadedCount = berkasData.length
  const progressPercent = Math.round((uploadedCount / REQUIRED_DOCUMENTS.length) * 100)

  if (loading) return null

  return (
    <div className="animate-fade-in space-y-10">
      {/* Header Section */}
      <header>
        <h1 className="text-[32px] leading-[40px] font-bold tracking-tight text-[var(--on-surface)]">Berkas Magang</h1>
        <p className="text-[14px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest mt-1">
          Manajemen Dokumen Administrasi
        </p>
      </header>

      {/* Progress Card (M3 Bento Style) */}
      <section className="bg-[var(--surface-container-lowest)] p-10 rounded-[40px] border border-[var(--outline-variant)] shadow-sm flex flex-col md:flex-row items-center gap-10">
        <div className="relative flex items-center justify-center flex-shrink-0">
          <svg className="w-32 h-32 -rotate-90">
            <circle className="text-[var(--surface-container-high)]" cx="64" cy="64" fill="transparent" r="56" stroke="currentColor" strokeWidth="12"></circle>
            <circle className="text-[var(--primary)] transition-all duration-1000" cx="64" cy="64" fill="transparent" r="56" stroke="currentColor" strokeDasharray="351.8" strokeDashoffset={351.8 - (351.8 * progressPercent / 100)} strokeLinecap="round" strokeWidth="12"></circle>
          </svg>
          <span className="absolute text-[28px] font-black text-[var(--primary)]">{progressPercent}%</span>
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-[22px] font-black text-[var(--on-surface)] mb-2">Progres Kelengkapan Berkas</h2>
          <p className="text-[16px] font-medium text-[var(--on-surface-variant)] mb-6">
            {uploadedCount} dari {REQUIRED_DOCUMENTS.length} berkas telah diunggah. Pastikan semua berkas valid untuk mempercepat verifikasi.
          </p>
          <div className="w-full bg-[var(--surface-container-high)] h-4 rounded-full overflow-hidden">
            <div 
              className="bg-[var(--primary)] h-full transition-all duration-1000 ease-out shadow-lg" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </section>

      {/* Document Upload Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {REQUIRED_DOCUMENTS.map(docType => {
          const uploadedFile = getBerkas(docType)
          const isUploading = docType in uploadingState
          const uploadProgress = uploadingState[docType] || 0

          return (
            <DocumentCard
              key={docType}
              docType={docType}
              uploadedFile={uploadedFile}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              onUpload={(file) => handleFileUpload(file, docType)}
              onDelete={() => uploadedFile && handleDelete(uploadedFile)}
            />
          )
        })}
      </section>

      {/* Help Section (M3 Style) */}
      <section className="bg-[var(--primary-container)] p-8 rounded-[32px] flex items-start gap-6 border border-[var(--primary)]/10">
        <span className="material-symbols-outlined text-[36px] text-[var(--on-primary-container)]">info</span>
        <div>
          <h4 className="text-[18px] font-black text-[var(--on-primary-container)] mb-1">Butuh Bantuan?</h4>
          <p className="text-[14px] font-medium text-[var(--on-primary-container)] opacity-80 leading-relaxed">
            Jika Anda mengalami kendala saat mengunggah dokumen, silakan hubungi koordinator magang Anda atau kirimkan tiket bantuan melalui menu Support.
          </p>
        </div>
      </section>
    </div>
  )
}

function DocumentCard({
  docType,
  uploadedFile,
  isUploading,
  uploadProgress,
  onUpload,
  onDelete
}: {
  docType: string
  uploadedFile?: Berkas
  isUploading: boolean
  uploadProgress: number
  onUpload: (file: File) => void
  onDelete: () => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={`bg-[var(--surface-container-lowest)] p-8 rounded-[32px] border transition-all duration-300 flex flex-col h-full relative overflow-hidden shadow-sm group ${
      isDragOver ? 'border-[var(--primary)] bg-[var(--primary-container)]/10' : 'border-[var(--outline-variant)]'
    }`}>
      <div className="flex justify-between items-start mb-8">
        <h3 className="text-[16px] font-black text-[var(--on-surface)] leading-tight max-w-[70%] group-hover:text-[var(--primary)] transition-colors">{docType}</h3>
        {uploadedFile ? (
          <span className="bg-[#e6f4ea] text-[#137333] text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] fill-icon">check_circle</span> 
            Selesai
          </span>
        ) : (
          <span className="bg-[var(--secondary-container)] text-[var(--on-secondary-container)] text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest">
            Belum
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        {uploadedFile ? (
          <div className="bg-[var(--surface-container-low)] rounded-2xl p-4 flex items-center justify-between mt-auto border border-[var(--outline-variant)]/30 group-hover:bg-white transition-all">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[var(--primary)] border border-[var(--outline-variant)] shadow-sm">
                <span className="material-symbols-outlined text-[24px]">description</span>
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-black text-[var(--on-surface)] truncate pr-2" title={uploadedFile.file_name}>{uploadedFile.file_name}</p>
                <p className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase mt-0.5">
                  {(uploadedFile.file_size / 1024 / 1024).toFixed(2)} MB • {new Date(uploadedFile.uploaded_at).toLocaleDateString('id-ID')}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <a 
                href={uploadedFile.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center text-[var(--primary)] bg-white border border-[var(--outline-variant)] rounded-xl hover:bg-[var(--primary-container)] transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">visibility</span>
              </a>
              <button 
                onClick={onDelete}
                className="w-9 h-9 flex items-center justify-center text-[var(--error)] bg-white border border-[var(--outline-variant)] rounded-xl hover:bg-[var(--error-container)] transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ) : isUploading ? (
          <div className="mt-auto bg-[var(--surface-container-low)] rounded-2xl p-8 border border-[var(--outline-variant)] flex flex-col items-center justify-center text-center">
            <div className="w-full bg-[var(--surface-container-high)] rounded-full h-2 mb-4 overflow-hidden">
              <div 
                className="bg-[var(--primary)] h-2 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-[12px] text-[var(--primary)] font-black uppercase tracking-widest">Mengunggah... {uploadProgress}%</p>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragOver(false)
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) onUpload(e.dataTransfer.files[0])
            }}
            onClick={() => fileInputRef.current?.click()}
            className="mt-auto border-2 border-dashed border-[var(--outline-variant)] rounded-[24px] p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[var(--surface-container-low)] hover:border-[var(--primary)] transition-all group/upload"
          >
            <span className="material-symbols-outlined text-[48px] text-[var(--outline)] group-hover/upload:text-[var(--primary)] mb-3 transition-colors">cloud_upload</span>
            <p className="text-[14px] font-black text-[var(--on-surface)] mb-1">Klik atau Drop file di sini</p>
            <p className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase tracking-wider">PDF, JPG, PNG (Max. 10MB)</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) onUpload(e.target.files[0])
                if (fileInputRef.current) fileInputRef.current.value = ''
              }} 
              accept=".pdf,image/jpeg,image/png,image/jpg" 
              className="hidden" 
            />
          </div>
        )}
      </div>
    </div>
  )
}
