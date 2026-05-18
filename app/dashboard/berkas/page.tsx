'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Download, 
  Trash2,
  Plus,
  ChevronRight,
  ShieldCheck
} from 'lucide-react'
import { toast } from 'sonner'

// Memaksa rendering dinamis untuk menghindari kegagalan pembacaan cookie pada fase static build
export const dynamic = 'force-dynamic'

export default function BerkasPage() {
  const [berkas, setBerkas] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)

  useEffect(() => {
    fetchBerkas()
  }, [])

  async function fetchBerkas() {
    try {
      setLoading(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setLoading(false)
        return
      }

      // Fetch profile dengan maybeSingle() untuk mencegah crash jika data kosong
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) console.error('Error fetching profile:', profileError)
      
      const activeProfile = profileData || { id: user.id, nama_lengkap: 'Pengguna ORBIT' }
      setProfile(activeProfile)

      // Fetch data berkas
      const { data: berkasData, error: berkasError } = await supabase
        .from('berkas')
        .select('*')
        .eq('mahasiswa_id', user.id)

      if (berkasError) console.error('Error fetching berkas:', berkasError)
      
      setBerkas(Array.isArray(berkasData) ? berkasData : [])
    } catch (error) {
      console.error('Critical runtime fetch error (berkas):', error)
      setBerkas([])
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, type: string) {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    setUploading(type)
    try {
      // 1. Upload ke Storage Bucket 'berkas' (huruf kecil semua)
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${type}-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('berkas')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // 2. Ambil Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('berkas')
        .getPublicUrl(fileName)

      // 3. Simpan/Update Record di Database
      const { error: dbError } = await supabase
        .from('berkas')
        .upsert({
          mahasiswa_id: profile.id,
          document_type: type,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size
        }, { onConflict: 'mahasiswa_id, document_type' })

      if (dbError) throw dbError

      toast.success(`${type} berhasil diunggah`)
      fetchBerkas()
    } catch (error: any) {
      toast.error('Gagal mengunggah: ' + (error.message || 'Error tidak dikenal'))
    } finally {
      setUploading(null)
    }
  }

  async function handleDelete(id: string, type: string) {
    if (!confirm(`Hapus ${type}?`)) return
    try {
      const { error } = await supabase.from('berkas').delete().eq('id', id)
      if (error) throw error
      toast.success(`${type} berhasil dihapus`)
      fetchBerkas()
    } catch (error: any) {
      toast.error('Gagal menghapus: ' + error.message)
    }
  }

  const documentTypes = [
    { id: 'surat_lamaran', name: 'Surat Lamaran', icon: FileText, desc: 'Dokumen pengajuan magang ke instansi.' },
    { id: 'cv_resume', name: 'CV / Resume', icon: Upload, desc: 'Curriculum Vitae terbaru Anda.' },
    { id: 'ktm_ktp', name: 'KTM / KTP', icon: AlertCircle, desc: 'Kartu Identitas Mahasiswa atau KTP.' },
    { id: 'asuransi', name: 'Asuransi Kesehatan', icon: ShieldCheck, desc: 'Bukti kepemilikan asuransi aktif (Opsional).' },
    { id: 'transkrip', name: 'Transkrip Nilai', icon: Clock, desc: 'Nilai kumulatif semester terakhir.' }
  ]

  // Safe Progress Calculation
  const safeBerkas = Array.isArray(berkas) ? berkas : []
  const uploadedCount = safeBerkas.length
  const totalCount = documentTypes.length
  const progressPercent = Math.round((uploadedCount / totalCount) * 100)

  // Strict Loading Boundary
  if (loading) {
    return (
      <div className="fixed inset-0 z-[999] bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 border-4 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin mx-auto shadow-sm"></div>
          <p className="text-[var(--text-main)] font-bold text-lg tracking-tight">Menyelaraskan Berkas Digital...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div>
          <h1 className="h1-orbit text-[var(--text-main)]">Pusat Dokumen</h1>
          <p className="subtitle-orbit text-[var(--text-muted)] mt-1">Lengkapi administrasi magang Anda secara digital.</p>
        </div>
        <div className="flex items-center gap-6 bg-white px-8 py-4 rounded-[32px] shadow-sm border border-gray-100">
           <div className="flex flex-col text-right">
              <span className="caption-orbit font-bold text-[var(--text-light)] uppercase">Kelengkapan</span>
              <span className="body2-orbit font-bold text-[var(--text-main)]">{uploadedCount} dari {totalCount} Berkas</span>
           </div>
           <div className="w-14 h-14 rounded-2xl accent-gradient flex items-center justify-center text-white shadow-lg">
              <span className="font-bold">{progressPercent}%</span>
           </div>
        </div>
      </div>

      {/* Grid Bento Dokumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {documentTypes.map((type) => {
          const fileData = safeBerkas.find(b => b && b.document_type === type.name)
          const isUploading = uploading === type.name
          const Icon = type.icon

          return (
            <div key={type.id} className="neumorphic-card p-8 group hover:scale-[1.02] transition-all duration-300 shadow-sm border border-transparent hover:border-blue-100/50">
               <div className="flex items-start justify-between mb-8">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${fileData ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-[var(--text-light)] group-hover:bg-blue-50 group-hover:text-[var(--accent-blue)]'}`}>
                     <Icon size={28} />
                  </div>
                  {fileData && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 animate-in zoom-in duration-500">
                       <CheckCircle2 size={12} />
                       <span className="text-[10px] font-bold uppercase tracking-widest">Tersimpan</span>
                    </div>
                  )}
               </div>

               <div className="space-y-2">
                  <h3 className="body1-orbit font-bold text-[var(--text-main)]">{type.name}</h3>
                  <p className="caption-orbit text-[var(--text-light)] leading-relaxed font-medium">{type.desc}</p>
               </div>

               <div className="mt-10 pt-8 border-t border-gray-50">
                  {fileData ? (
                    <div className="flex items-center justify-between">
                       <a 
                          href={fileData.file_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center gap-2 text-[var(--accent-blue)] font-bold caption-orbit hover:opacity-70 transition-opacity"
                       >
                          <Download size={16} /> Lihat Berkas
                       </a>
                       <button 
                          onClick={() => handleDelete(fileData.id, type.name)} 
                          className="w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                       >
                          <Trash2 size={18} />
                       </button>
                    </div>
                  ) : (
                    <label className={`w-full py-4 flex items-center justify-center gap-3 rounded-2xl cursor-pointer transition-all ${isUploading ? 'bg-gray-100 opacity-50' : 'bg-gray-50 hover:bg-[var(--accent-blue)] hover:text-white group-hover:shadow-md'}`}>
                       {isUploading ? (
                         <div className="w-5 h-5 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin"></div>
                       ) : (
                         <Plus size={18} />
                       )}
                       <span className="label-orbit font-bold uppercase tracking-widest">{isUploading ? 'Mengunggah...' : 'Unggah File'}</span>
                       <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => handleUpload(e, type.name)} 
                          disabled={!!uploading}
                       />
                    </label>
                  )}
               </div>
            </div>
          )
        })}
      </div>

      {/* Info Card */}
      <div className="neumorphic-card p-10 bg-slate-900 text-white shadow-xl shadow-slate-100 flex flex-col md:flex-row items-center gap-10">
         <div className="w-20 h-20 bg-white/10 rounded-[32px] flex items-center justify-center backdrop-blur-md shrink-0">
            <ShieldCheck size={32} className="text-blue-400" />
         </div>
         <div className="space-y-4 flex-1">
            <h3 className="h4-orbit">Sistem Penyimpanan Terverifikasi</h3>
            <p className="body2-orbit opacity-70 leading-relaxed font-medium max-w-3xl">
               Semua berkas yang Anda unggah akan disimpan secara aman di infrastruktur cloud ORBIT. Dokumen ini diperlukan untuk keperluan administratif sertifikasi magang Anda di akhir program.
            </p>
         </div>
         <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl caption-orbit font-bold uppercase tracking-widest transition-all backdrop-blur-sm border border-white/10"
         >
            Refresh Data
         </button>
      </div>
    </div>
  )
}