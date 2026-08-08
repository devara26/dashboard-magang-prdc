'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileQuestion,
  RefreshCw,
  Info
} from 'lucide-react'
import { toast } from 'sonner'
import BerkasProgress from '@/components/BerkasProgress'
import FileUpload from '@/components/FileUpload'
import { getActivePeriode } from '@/lib/periode'

export const dynamic = 'force-dynamic'

interface JenisBerkas {
  id: string
  nama_berkas: string
  kategori: string
  keterangan: string
  is_wajib: boolean
  urutan: number
}

interface BerkasMahasiswa {
  id: string
  mahasiswa_id: string
  jenis_berkas_id: string
  nama_file: string
  file_url: string
  tipe_file: string
  ukuran_bytes: number
  status: 'Menunggu Review' | 'Diverifikasi' | 'Ditolak'
  catatan_dosen: string | null
  tanggal_upload: string
}

export default function BerkasSayaPage() {
  const [jenisBerkas, setJenisBerkas] = useState<JenisBerkas[]>([])
  const [berkasUploaded, setBerkasUploaded] = useState<BerkasMahasiswa[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [activePeriodeId, setActivePeriodeId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'idle' | 'uploading' | 'success' | 'error'>>({})
  const [uploadErrorMsg, setUploadErrorMsg] = useState<Record<string, string>>({})
  const [showUploaderId, setShowUploaderId] = useState<string | null>(null)

  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    try {
      setLoading(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        toast.error('Sesi tidak ditemukan. Silakan login kembali.')
        setLoading(false)
        return
      }
      setUserId(user.id)

      // Fetch master data jenis berkas
      const { data: jenisData, error: jenisError } = await supabase
        .from('jenis_berkas')
        .select('*')
        .order('urutan', { ascending: true })

      if (jenisError) throw jenisError
      setJenisBerkas(jenisData || [])

      const activePeriode = await getActivePeriode(supabase, user.id)
      const currentPeriodeId = activePeriode?.id || null
      setActivePeriodeId(currentPeriodeId)

      if (!currentPeriodeId) {
        setLoading(false)
        return
      }

      // Fetch berkas mahasiswa yang sudah diupload
      const { data: uploadData, error: uploadError } = await supabase
        .from('berkas')
        .select('*')
        .eq('mahasiswa_id', user.id)
        .eq('periode_id', currentPeriodeId)

      if (uploadError) throw uploadError
      setBerkasUploaded(uploadData || [])
    } catch (error: any) {
      console.error('Error fetching berkas data:', JSON.stringify(error))
      toast.error('Gagal memuat data berkas: ' + (error.message || 'Terjadi kesalahan'))
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (file: File, jenisBerkasId: string) => {
    if (!userId) return

    setUploadingId(jenisBerkasId)
    setUploadStatus(prev => ({ ...prev, [jenisBerkasId]: 'uploading' }))
    setUploadErrorMsg(prev => ({ ...prev, [jenisBerkasId]: '' }))

    try {
      const fileExt = file.name.split('.').pop()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_')
      const filePath = `${userId}/${jenisBerkasId}/${Date.now()}_${sanitizedFileName}`

      // 1. Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('berkas')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('berkas')
        .getPublicUrl(filePath)

      // 3. Save or update record in database
      const existing = berkasUploaded.find(b => b.jenis_berkas_id === jenisBerkasId)
      
      if (existing) {
        // Update record
        const { error: dbError } = await supabase
          .from('berkas')
          .update({
            nama_file: file.name,
            file_url: publicUrl,
            tipe_file: file.type,
            ukuran_bytes: file.size,
            status: 'Menunggu Review',
            catatan_dosen: null,
            tanggal_upload: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (dbError) throw dbError
      } else {
        // Insert record
        const { error: dbError } = await supabase
          .from('berkas')
          .insert({
            mahasiswa_id: userId,
            jenis_berkas_id: jenisBerkasId,
            nama_file: file.name,
            file_url: publicUrl,
            tipe_file: file.type,
            ukuran_bytes: file.size,
            status: 'Menunggu Review',
            tanggal_upload: new Date().toISOString(),
            periode_id: activePeriodeId
          })

        if (dbError) throw dbError
      }

      setUploadStatus(prev => ({ ...prev, [jenisBerkasId]: 'success' }))
      toast.success('Berkas berhasil diunggah')
      setShowUploaderId(null)
      
      // Refresh data berkas mahasiswa
      const { data: uploadData } = await supabase
        .from('berkas')
        .select('*')
        .eq('mahasiswa_id', userId)
        .eq('periode_id', activePeriodeId)
      setBerkasUploaded(uploadData || [])

    } catch (error: any) {
      console.error('Upload error:', JSON.stringify(error))
      setUploadStatus(prev => ({ ...prev, [jenisBerkasId]: 'error' }))
      setUploadErrorMsg(prev => ({ ...prev, [jenisBerkasId]: error.message || 'Gagal mengunggah berkas' }))
      toast.error('Gagal mengunggah: ' + (error.message || 'Terjadi kesalahan'))
    } finally {
      setUploadingId(null)
    }
  }

  const handleClear = (jenisBerkasId: string) => {
    setUploadStatus(prev => ({ ...prev, [jenisBerkasId]: 'idle' }))
    setUploadErrorMsg(prev => ({ ...prev, [jenisBerkasId]: '' }))
  }

  // Calculate stats
  // "Diverifikasi" counts as complete
  const verifiedCount = berkasUploaded.filter(b => b.status === 'Diverifikasi').length
  const totalCount = jenisBerkas.length
  
  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-gray-50/50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto shadow-sm"></div>
          <p className="text-gray-500 font-bold text-sm tracking-tight animate-pulse">Menyelaraskan Berkas Digital...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1400px] mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left bg-white p-8 rounded-3xl border border-gray-150 border-gray-200/60 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Berkas Saya</h1>
          <p className="text-gray-500 text-sm font-medium">Unggah dan pantau status kelengkapan berkas wajib magang Anda di sini.</p>
        </div>
        <div className="w-full md:w-80 bg-gray-50 p-6 rounded-2xl border border-gray-100">
          <BerkasProgress value={verifiedCount} total={totalCount} />
        </div>
      </div>

      {/* Checklist List */}
      <div className="space-y-4">
        {jenisBerkas.map((jenis) => {
          const userFile = berkasUploaded.find(b => b.jenis_berkas_id === jenis.id)
          const isUploading = uploadingId === jenis.id
          const currentStatus = uploadStatus[jenis.id] || 'idle'
          const errorMsg = uploadErrorMsg[jenis.id]
          const isUploaderOpen = showUploaderId === jenis.id

          // Determine status text & colors
          let statusLabel = 'Belum Upload'
          let statusBadgeClass = 'bg-gray-100 text-gray-600 border-gray-200'
          let statusIcon = <FileQuestion size={14} className="text-gray-400" />

          if (userFile) {
            if (userFile.status === 'Diverifikasi') {
              statusLabel = 'Diverifikasi'
              statusBadgeClass = 'bg-emerald-50 text-emerald-600 border-emerald-100'
              statusIcon = <CheckCircle2 size={14} className="text-emerald-500" />
            } else if (userFile.status === 'Ditolak') {
              statusLabel = 'Ditolak'
              statusBadgeClass = 'bg-red-50 text-red-600 border-red-100 animate-pulse'
              statusIcon = <AlertCircle size={14} className="text-red-500" />
            } else {
              statusLabel = 'Menunggu Review'
              statusBadgeClass = 'bg-amber-50 text-amber-600 border-amber-100'
              statusIcon = <Clock size={14} className="text-amber-500" />
            }
          }

          return (
            <div 
              key={jenis.id} 
              className={`bg-white rounded-2xl border transition-all duration-300 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md ${
                userFile?.status === 'Ditolak' ? 'border-red-200 bg-red-50/5' : 'border-gray-200/80 hover:border-blue-200/50'
              }`}
            >
              {/* Left Column: Icon & Document Details */}
              <div className="flex items-start gap-4 flex-1">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  userFile?.status === 'Diverifikasi' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  <FileText size={22} />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-base font-bold text-gray-900 leading-tight">{jenis.nama_berkas}</h3>
                    <span className="text-[10px] px-2.5 py-0.5 bg-gray-100 text-gray-500 font-bold uppercase tracking-wider rounded-full border border-gray-200">
                      {jenis.kategori}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${statusBadgeClass}`}>
                      {statusIcon}
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">
                    {jenis.keterangan || 'Tidak ada keterangan tambahan.'}
                  </p>
                  
                  {/* Upload Date for tracking */}
                  {userFile && (
                    <p className="text-[10px] text-gray-400 font-semibold pt-1">
                      Diunggah pada: {new Date(userFile.tanggal_upload).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}

                  {/* Lecturer Rejection Notes */}
                  {userFile && userFile.status === 'Ditolak' && userFile.catatan_dosen && (
                    <div className="mt-3 bg-red-50/50 border border-red-100 rounded-xl p-3 flex items-start gap-2 max-w-xl">
                      <Info size={14} className="text-red-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-red-650 text-red-600 uppercase tracking-widest">Catatan Penolakan Dosen:</p>
                        <p className="text-xs font-semibold text-red-750 text-red-700 leading-relaxed">
                          {userFile.catatan_dosen}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Upload Uploader or Button Action */}
              <div className="w-full md:w-auto shrink-0 flex flex-col items-stretch md:items-end justify-center">
                {userFile && !isUploaderOpen ? (
                  <div className="space-y-3">
                    {/* File has been uploaded, show link and possibly upload-again button */}
                    <div className="flex items-center justify-end gap-3 flex-wrap">
                      <a
                        href={userFile.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 md:flex-initial text-center px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-750 text-gray-700 rounded-xl text-xs font-bold transition-all"
                      >
                        Lihat Berkas
                      </a>
                      {userFile.status === 'Ditolak' && (
                        <button
                          onClick={() => setShowUploaderId(jenis.id)}
                          className="flex-1 md:flex-initial px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <RefreshCw size={14} /> Upload Ulang
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-full md:w-[320px]">
                    {isUploaderOpen || !userFile ? (
                      <div className="space-y-2">
                        <FileUpload
                          onFileSelect={(file) => handleUpload(file, jenis.id)}
                          onClear={() => handleClear(jenis.id)}
                          status={isUploading ? 'uploading' : currentStatus === 'success' ? 'success' : 'idle'}
                          errorMessage={errorMsg}
                          currentFileName={userFile?.nama_file}
                          currentFileUrl={userFile?.file_url}
                        />
                        {userFile && (
                          <button
                            onClick={() => {
                              setShowUploaderId(null)
                              handleClear(jenis.id)
                            }}
                            className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-bold transition-all border border-gray-250 border-gray-200"
                          >
                            Batal Upload Ulang
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}