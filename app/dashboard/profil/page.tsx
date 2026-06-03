'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { exportLaporanExcel } from '@/lib/export-excel'
import { verifyDosenAction } from './actions'
import { 
  User, 
  Mail, 
  School, 
  Building, 
  Calendar, 
  Download, 
  Edit, 
  Camera, 
  ShieldCheck, 
  LogOut, 
  Save, 
  X,
  ChevronRight
} from 'lucide-react'

// Memaksa Vercel agar tidak melakukan optimasi statis yang merusak pembacaan cookie Supabase auth
export const dynamic = 'force-dynamic'

interface Profile {
  id: string
  nama_lengkap: string
  nim: string
  universitas: string
  prodi: string
  instansi_magang: string
  unit_magang: string
  tanggal_mulai: string
  tanggal_selesai: string
  bio: string
  avatar_url: string | null
}

export default function ProfilPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [downloadingExcel, setDownloadingExcel] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Profile>>({})
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showDosenModal, setShowDosenModal] = useState(false)
  const [dosenCode, setDosenCode] = useState('')
  const [modalError, setModalError] = useState('')
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => { fetchUser() }, [])

  async function fetchUser() {
    try {
      setLoading(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setLoading(false)
        return router.push('/login')
      }
      setEmail(user?.email || '')
      
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) console.error('Error fetching profile:', profileError)

      if (data) { 
        setProfile(data)
        setForm(data)
        setAvatarUrl(data?.avatar_url || null)
      } else {
        const fallback = { id: user.id, nama_lengkap: 'Pengguna ORBIT' }
        setProfile(fallback as any)
        setForm(fallback as any)
      }
    } catch (error) {
      console.error('Runtime profile fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    if (confirm('Keluar dari aplikasi?')) { 
       await supabase.auth.signOut()
       router.push('/login')
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile?.id) return
    setSaving(true)
    try {
      const { data, error } = await supabase.from('profiles').update({ ...form }).eq('id', profile.id).select()
      if (error || !data?.length) throw new Error('Gagal update data profil.')
      setProfile({ ...profile, ...form } as Profile)
      setIsEditing(false)
      toast.success('Profil berhasil diperbarui')
    } catch (error: any) {
      toast.error('Gagal memperbarui: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return
    const previewUrl = URL.createObjectURL(file)
    setAvatarUrl(previewUrl)
    setUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${profile.id}-${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id)
      setAvatarUrl(publicUrl)
      toast.success('Foto profil diperbarui')
      router.refresh()
    } catch (error: any) {
      toast.error('Gagal mengunggah foto: ' + error.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleDownloadExcel() {
    if (!profile) return
    try {
      setDownloadingExcel(true)
      await exportLaporanExcel(profile)
      toast.success('Laporan berhasil diunduh')
    } catch (error: any) {
      toast.error('Gagal mengunduh: ' + error.message)
    } finally {
      setDownloadingExcel(false)
    }
  }

  async function handleDosenCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setModalLoading(true)
    setModalError('')
    
    try {
      const res = await verifyDosenAction(dosenCode)
      if (res.success) {
        window.location.href = '/dosen'
      } else {
        setModalError(res.error || 'Kode akses salah!')
        setModalLoading(false)
      }
    } catch (err: any) {
      setModalError('Terjadi kesalahan sistem. Coba lagi.')
      setModalLoading(false)
    }
  }

  // Strict Loading Boundary
  if (loading) {
    return (
      <div className="fixed inset-0 z-[999] bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 border-4 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin mx-auto shadow-sm"></div>
          <p className="text-[var(--text-main)] font-bold text-lg tracking-tight">Menyelaraskan Profil ORBIT...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12 pb-24 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
        <div>
           <h1 className="h1-orbit text-[var(--text-main)]">Profil Akun</h1>
           <p className="subtitle-orbit text-[var(--text-muted)] mt-1">Kelola identitas dan informasi magang Anda.</p>
        </div>
        <div className="flex items-center gap-4">
           <button 
              onClick={handleDownloadExcel} 
              disabled={downloadingExcel}
              className="neumorphic-button flex items-center gap-2 bg-white text-[var(--text-main)] shadow-sm active:scale-95 transition-all"
           >
              <Download size={20} className="text-[var(--accent-blue)]" />
              <span className="label-orbit font-bold">{downloadingExcel ? 'Memproses...' : 'Ekspor Info'}</span>
           </button>
           {!isEditing && (
             <button 
                onClick={() => setIsEditing(true)} 
                className="neumorphic-button flex items-center gap-2 accent-gradient text-white border-none shadow-xl shadow-blue-100 active:scale-95 transition-all"
             >
                <Edit size={20} />
                <span className="label-orbit font-bold">Edit Profil</span>
             </button>
           )}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="neumorphic-card p-10 md:p-14 space-y-14 shadow-sm">
           <div className="flex flex-col items-center">
              <div className="relative group">
                 <div className="w-40 h-40 rounded-[40px] accent-gradient border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                       <img src={avatarUrl} className="w-full h-full object-cover" />
                    ) : (
                       <span className="text-6xl font-bold text-white">{(profile?.nama_lengkap ?? 'P').charAt(0)}</span>
                    )}
                    {uploadingAvatar && (
                       <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                       </div>
                    )}
                 </div>
                 <label className="absolute -bottom-4 -right-4 w-14 h-14 bg-white rounded-2xl shadow-2xl flex items-center justify-center text-[var(--accent-blue)] cursor-pointer hover:scale-110 transition-all border border-gray-100 active:scale-95">
                    <Camera size={24} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                 </label>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-10">
                 <div className="flex items-center gap-3 px-2 border-l-4 border-[var(--accent-blue)]">
                    <h3 className="caption-orbit font-bold text-[var(--text-main)] uppercase tracking-[2px]">Data Akademik</h3>
                 </div>
                 <div className="space-y-8">
                    <div className="space-y-2">
                       <label className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest ml-1">Nama Lengkap</label>
                       <input 
                          value={form?.nama_lengkap || ''} 
                          onChange={e => setForm({...form, nama_lengkap: e.target.value})} 
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 body2-orbit font-semibold outline-none focus:ring-4 focus:ring-[var(--accent-blue)]/10 focus:bg-white transition-all shadow-inner" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest ml-1">Nomor Induk Mahasiswa (NIM)</label>
                       <input 
                          value={form?.nim || ''} 
                          onChange={e => setForm({...form, nim: e.target.value})} 
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 body2-orbit font-semibold outline-none focus:ring-4 focus:ring-[var(--accent-blue)]/10 focus:bg-white transition-all shadow-inner" 
                       />
                    </div>
                 </div>
              </div>

              <div className="space-y-10">
                 <div className="flex items-center gap-3 px-2 border-l-4 border-orange-500">
                    <h3 className="caption-orbit font-bold text-[var(--text-main)] uppercase tracking-[2px]">Detail Magang</h3>
                 </div>
                 <div className="space-y-8">
                    <div className="space-y-2">
                       <label className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest ml-1">Instansi / Perusahaan</label>
                       <input 
                          value={form?.instansi_magang || ''} 
                          onChange={e => setForm({...form, instansi_magang: e.target.value})} 
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 body2-orbit font-semibold outline-none focus:ring-4 focus:ring-[var(--accent-blue)]/10 focus:bg-white transition-all shadow-inner" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest ml-1">Unit / Divisi</label>
                       <input 
                          value={form?.unit_magang || ''} 
                          onChange={e => setForm({...form, unit_magang: e.target.value})} 
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 body2-orbit font-semibold outline-none focus:ring-4 focus:ring-[var(--accent-blue)]/10 focus:bg-white transition-all shadow-inner" 
                       />
                    </div>
                 </div>
              </div>
           </div>

           <div className="flex flex-col md:flex-row justify-end gap-6 pt-10 border-t border-gray-100">
              <button 
                 type="button" 
                 onClick={() => setIsEditing(false)} 
                 className="px-10 py-5 body2-orbit font-bold text-[var(--text-muted)] hover:bg-gray-100 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                 <X size={18} />
                 Batal
              </button>
              <button 
                 type="submit" 
                 disabled={saving} 
                 className="px-12 py-5 accent-gradient text-white rounded-2xl label-orbit font-bold uppercase tracking-widest shadow-xl shadow-blue-100 hover:shadow-blue-200 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                 <Save size={18} />
                 {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
           </div>
        </form>
      ) : (
        <div className="space-y-10">
           {/* Profile Header Card */}
           <section className="neumorphic-card p-10 md:p-14 flex flex-col md:flex-row items-center gap-12 text-center md:text-left relative overflow-hidden shadow-sm">
              <div className="absolute right-0 top-0 w-80 h-80 bg-blue-50 rounded-full -mr-40 -mt-40 opacity-50"></div>
              <div className="w-44 h-44 rounded-[48px] accent-gradient border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden flex-shrink-0 relative group">
                 {avatarUrl ? (
                    <img src={avatarUrl} className="w-full h-full object-cover" />
                 ) : (
                    <span className="text-7xl font-bold text-white">{(profile?.nama_lengkap ?? 'P').charAt(0)}</span>
                 )}
                 <button 
                    onClick={() => setIsEditing(true)} 
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-sm"
                 >
                    <Edit size={32} />
                 </button>
              </div>
              <div className="flex-1 space-y-6 relative z-10">
                 <div>
                    <h2 className="h2-orbit text-[var(--text-main)] leading-tight">{profile?.nama_lengkap ?? 'Pengguna ORBIT'}</h2>
                    <div className="flex flex-wrap gap-4 mt-4 justify-center md:justify-start">
                       <span className="px-5 py-2 bg-emerald-50 text-emerald-600 rounded-full caption-orbit font-bold uppercase tracking-widest border border-emerald-100 flex items-center gap-2 shadow-sm">
                          <ShieldCheck size={14} />
                          Mahasiswa Aktif
                       </span>
                       <span className="px-5 py-2 bg-gray-50 text-[var(--text-muted)] rounded-full caption-orbit font-bold uppercase tracking-widest border border-gray-100 flex items-center gap-2 shadow-inner">
                          <User size={14} />
                          {profile?.nim ?? 'NIM ---'}
                       </span>
                    </div>
                 </div>
                 <p className="body1-orbit text-[var(--text-muted)] max-w-2xl leading-relaxed italic">
                    "{profile?.bio || 'Mendokumentasikan perjalanan magang melalui platform monitoring ORBIT.'}"
                 </p>
              </div>
           </section>

           {/* Bento Info Grid */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="neumorphic-card p-10 space-y-10 shadow-sm">
                 <div className="flex items-center justify-between">
                    <h3 className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-[2px]">Akses Akun</h3>
                    <User size={20} className="text-[var(--accent-blue)] opacity-50" />
                 </div>
                 <div className="space-y-6">
                    <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-[24px] border border-gray-100 transition-all hover:bg-white hover:shadow-md group shadow-inner">
                       <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[var(--accent-blue)] shadow-sm group-hover:scale-110 transition-transform">
                          <Mail size={24} />
                       </div>
                       <div>
                          <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Email Terdaftar</p>
                          <p className="body2-orbit font-bold text-[var(--text-main)] mt-1">{email || '---'}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-[24px] border border-gray-100 transition-all hover:bg-white hover:shadow-md group shadow-inner">
                       <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm group-hover:scale-110 transition-transform">
                          <School size={24} />
                       </div>
                       <div>
                          <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Instansi Pendidikan</p>
                          <p className="body2-orbit font-bold text-[var(--text-main)] mt-1">{profile?.universitas ?? '---'} • {profile?.prodi ?? '---'}</p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="neumorphic-card p-10 space-y-10 shadow-sm">
                 <div className="flex items-center justify-between">
                    <h3 className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-[2px]">Data Magang</h3>
                    <Building size={20} className="text-orange-500 opacity-50" />
                 </div>
                 <div className="space-y-6">
                    <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-[24px] border border-gray-100 transition-all hover:bg-white hover:shadow-md group shadow-inner">
                       <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                          <Building size={24} />
                       </div>
                       <div>
                          <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Penempatan Unit</p>
                          <p className="body2-orbit font-bold text-[var(--text-main)] mt-1">{profile?.instansi_magang ?? '---'} — {profile?.unit_magang ?? '---'}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-[24px] border border-gray-100 transition-all hover:bg-white hover:shadow-md group shadow-inner">
                       <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm group-hover:scale-110 transition-transform">
                          <Calendar size={24} />
                       </div>
                       <div>
                          <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Durasi Kontrak</p>
                          <p className="body2-orbit font-bold text-[var(--text-main)] mt-1">{profile?.tanggal_mulai ?? '---'} s/d {profile?.tanggal_selesai ?? '---'}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Actions Area */}
           <div className="flex flex-col md:flex-row gap-8">
              <button 
                 onClick={() => setShowDosenModal(true)} 
                 className="flex-1 p-8 bg-[var(--text-main)] rounded-[32px] text-white label-orbit font-bold uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-[var(--accent-blue)] transition-all shadow-xl active:scale-95 group shadow-slate-100"
              >
                 <ShieldCheck size={24} className="group-hover:rotate-12 transition-transform" />
                 Akses Koordinator Dosen
                 <ChevronRight size={20} className="opacity-50" />
              </button>
              <button 
                 onClick={handleLogout} 
                 className="flex-1 p-8 bg-white border border-red-100 rounded-[32px] text-red-600 label-orbit font-bold uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-red-50 transition-all shadow-sm active:scale-95"
              >
                 <LogOut size={24} />
                 Keluar dari Akun
              </button>
           </div>
        </div>
      )}

      {/* Modal Verifikasi */}
      {showDosenModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="neumorphic-card w-full max-w-md p-10 space-y-10 text-center animate-in zoom-in-95 duration-300 shadow-2xl">
            <div className="w-24 h-24 bg-blue-50 text-[var(--accent-blue)] rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
               <ShieldCheck size={48} />
            </div>
            <div>
              <h3 className="h4-orbit text-[var(--text-main)]">Otorisasi Dosen</h3>
              <p className="body2-orbit text-[var(--text-muted)] mt-2 font-medium leading-relaxed">Gunakan kode akses khusus untuk beralih ke dashboard pembimbing.</p>
            </div>
            <form onSubmit={handleDosenCodeSubmit} className="space-y-8">
               <input 
                  type="password" 
                  value={dosenCode} 
                  onChange={e => setDosenCode(e.target.value)} 
                  placeholder="••••" 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-6 text-center font-bold tracking-[12px] text-2xl outline-none focus:ring-4 focus:ring-[var(--accent-blue)]/10 focus:bg-white transition-all shadow-inner" 
                  autoFocus 
               />
               {modalError && <p className="caption-orbit font-bold text-red-500 uppercase tracking-widest text-xs">{modalError}</p>}
               <div className="flex gap-4">
                  <button 
                     type="button" 
                     onClick={() => { setShowDosenModal(false); setModalError(''); }} 
                     className="flex-1 py-5 body2-orbit font-bold text-[var(--text-muted)] bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all shadow-sm active:scale-95"
                  >
                     Tutup
                  </button>
                  <button 
                     type="submit" 
                     disabled={modalLoading} 
                     className="flex-1 py-5 accent-gradient text-white label-orbit font-bold uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-all"
                  >
                     Verifikasi
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
