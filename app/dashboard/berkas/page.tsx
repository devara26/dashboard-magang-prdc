'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, CheckCircle2, UploadCloud, X, File, Eye, Trash2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const REQUIRED_DOCUMENTS = [
  'Surat Permohonan Magang dari Kampus',
  'Surat Penerimaan dari Tempat Magang',
  'Surat Pelepasan dari Tempat Magang',
  'Surat Rekognisi Magang',
  'Form Penilaian Magang',
  'Sertifikat',
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
  const [uploadingState, setUploadingState] = useState<Record<string, number>>({}) // percentage

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

    // Validations
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

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('berkas')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      setUploadingState(prev => ({ ...prev, [docType]: 80 }))

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('berkas')
        .getPublicUrl(filePath)

      // Save to database
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
      // Parse file path from URL
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

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1A73E8] rounded-full animate-spin"></div>
        <p className="text-[#5F6368] text-sm font-medium animate-pulse">Memuat data berkas...</p>
      </div>
    </div>
  )

  return (
    <div className="pb-12 animate-[fade-in_0.7s_ease-out] max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#202124]">Berkas Magang</h1>
        <p className="text-[#5F6368] text-sm mt-1">Unggah dokumen yang diperlukan untuk administrasi magang Anda.</p>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 mb-8 flex items-center gap-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center relative flex-shrink-0">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-gray-100"
              strokeWidth="3" fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-[#1A73E8]"
              strokeDasharray={`${progressPercent}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="currentColor" strokeWidth="3"
            />
          </svg>
          <span className="text-lg font-bold text-[#1A73E8] z-10">{progressPercent}%</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#202124]">Progres Kelengkapan Berkas</h2>
          <p className="text-[#5F6368] text-sm mt-1">{uploadedCount} dari {REQUIRED_DOCUMENTS.length} berkas telah diunggah.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files[0])
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className={`bg-white rounded-2xl p-5 border-2 transition-all ${isDragOver ? 'border-[#1A73E8] bg-[#E8F0FE]' : 'border-gray-100'} shadow-sm flex flex-col h-full relative overflow-hidden`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-[#202124] text-sm pr-4">{docType}</h3>
        {uploadedFile ? (
          <span className="bg-[#E6F4EA] text-[#137333] px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
            <CheckCircle2 className="w-3 h-3" /> Selesai
          </span>
        ) : (
          <span className="bg-gray-100 text-[#5F6368] px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
            Belum
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        {uploadedFile ? (
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between mt-auto border border-gray-200">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 bg-white rounded flex items-center justify-center text-[#1A73E8] border border-gray-200 flex-shrink-0 shadow-sm">
                <File className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#202124] truncate" title={uploadedFile.file_name}>{uploadedFile.file_name}</p>
                <p className="text-[10px] text-[#5F6368]">
                  {new Date(uploadedFile.uploaded_at).toLocaleDateString('id-ID')} • {(uploadedFile.file_size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <a 
                href={uploadedFile.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-[#1A73E8] bg-white border border-gray-200 rounded-lg hover:bg-[#E8F0FE] transition-colors"
                title="Lihat File"
              >
                <Eye className="w-4 h-4" />
              </a>
              <button 
                onClick={onDelete}
                className="p-2 text-[#C5221F] bg-white border border-gray-200 rounded-lg hover:bg-[#FCE8E6] transition-colors"
                title="Hapus File"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : isUploading ? (
          <div className="mt-auto bg-gray-50 rounded-xl p-5 border border-gray-200 flex flex-col items-center justify-center text-center">
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
              <div className="bg-[#1A73E8] h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <p className="text-xs text-[#1A73E8] font-medium">Mengunggah... {uploadProgress}%</p>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="mt-auto bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-100 hover:border-[#1A73E8] transition-all group"
          >
            <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-[#1A73E8] mb-2" />
            <p className="text-xs font-bold text-[#202124] mb-1 group-hover:text-[#1A73E8]">Klik atau Drop file di sini</p>
            <p className="text-[10px] text-[#5F6368]">PDF, JPG, PNG (Max. 10MB)</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleChange} 
              accept=".pdf,image/jpeg,image/png,image/jpg" 
              className="hidden" 
            />
          </div>
        )}
      </div>
    </div>
  )
}
