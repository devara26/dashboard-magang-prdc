'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { exportLaporanExcel } from '@/lib/export-excel'

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    setEmail(user.email || '')
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) { setProfile(data); setForm(data); setAvatarUrl(data.avatar_url); }
    setLoading(false)
  }

  async function handleLogout() {
    if (confirm('Keluar dari aplikasi?')) { await supabase.auth.signOut(); router.push('/login'); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { data, error } = await supabase.from('profiles').update({ ...form }).eq('id', profile?.id).select()
      if (error || !data?.length) throw new Error('Gagal update.')
      setProfile({ ...profile, ...form } as Profile)
      setIsEditing(false)
      toast.success('Profil diperbarui')
    } catch (error) {
      toast.error('Gagal memperbarui profil')
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
      toast.success('Foto diperbarui')
    } catch (error: any) {
      toast.error('Gagal upload: ' + error.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleDownloadExcel() {
    try {
      setDownloadingExcel(true)
      const { data: { user } } = await supabase.auth.getUser()
      await exportLaporanExcel(user as any)
      toast.success('Laporan diunduh')
    } catch (error: any) {
      toast.error('Gagal: ' + error.message)
    } finally {
      setDownloadingExcel(false)
    }
  }

  async function handleDosenCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setModalLoading(true)
    if (dosenCode === '123') {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('profiles').update({ role: 'dosen' }).eq('id', user?.id)
      window.location.href = '/dosen'
    } else {
      setModalError('Kode salah!'); setModalLoading(false);
    }
  }

  if (loading) return null

  return (
    <div className="animate-fade-in space-y-10 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-[32px] font-black text-[var(--on-surface)] tracking-tight">Profil Pengguna</h1>
          <p className="text-[14px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest mt-1">Pengaturan Akun Magang</p>
        </div>
        <button onClick={handleDownloadExcel} className="h-12 px-6 bg-[var(--surface-container-high)] text-[var(--primary)] rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 border border-[var(--primary)]/10 hover:bg-[var(--primary-container)] transition-all">
          <span className="material-symbols-outlined text-[20px]">download</span>
          {downloadingExcel ? 'Sabar...' : 'Laporan'}
        </button>
      </header>

      {isEditing ? (
        <form onSubmit={handleSave} className="bg-[var(--surface-container-lowest)] rounded-[48px] border border-[var(--outline-variant)] p-12 shadow-sm space-y-10">
           <div className="flex flex-col items-center gap-6">
              <div className="relative">
                 <div className="w-32 h-32 rounded-[40px] bg-[var(--primary)] border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                    {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <span className="text-5xl font-black text-white">{profile?.nama_lengkap?.charAt(0)}</span>}
                    {uploadingAvatar && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>}
                 </div>
                 <label className="absolute -bottom-2 -right-2 w-11 h-11 bg-white rounded-2xl shadow-lg flex items-center justify-center text-[var(--primary)] cursor-pointer hover:scale-110 transition-transform border border-[var(--outline-variant)]">
                    <span className="material-symbols-outlined">add_a_photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                 </label>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                 <h3 className="text-[12px] font-black text-[var(--primary)] uppercase tracking-widest">Informasi Akademik</h3>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest ml-1">Nama Lengkap</label>
                       <input value={form.nama_lengkap || ''} onChange={e => setForm({...form, nama_lengkap: e.target.value})} className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)]/50 rounded-2xl px-6 py-4 text-[14px] font-bold outline-none focus:border-[var(--primary)] focus:bg-white transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest ml-1">NIM / Identitas</label>
                       <input value={form.nim || ''} onChange={e => setForm({...form, nim: e.target.value})} className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)]/50 rounded-2xl px-6 py-4 text-[14px] font-bold outline-none focus:border-[var(--primary)] focus:bg-white transition-all" />
                    </div>
                 </div>
              </div>
              <div className="space-y-6">
                 <h3 className="text-[12px] font-black text-[var(--primary)] uppercase tracking-widest">Detail Penempatan</h3>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest ml-1">Instansi</label>
                       <input value={form.instansi_magang || ''} onChange={e => setForm({...form, instansi_magang: e.target.value})} className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)]/50 rounded-2xl px-6 py-4 text-[14px] font-bold outline-none focus:border-[var(--primary)] focus:bg-white transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest ml-1">Unit / Divisi</label>
                       <input value={form.unit_magang || ''} onChange={e => setForm({...form, unit_magang: e.target.value})} className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)]/50 rounded-2xl px-6 py-4 text-[14px] font-bold outline-none focus:border-[var(--primary)] focus:bg-white transition-all" />
                    </div>
                 </div>
              </div>
           </div>

           <div className="flex justify-end gap-4 pt-10 border-t border-[var(--outline-variant)]/30">
              <button type="button" onClick={() => setIsEditing(false)} className="px-8 py-4 font-black text-xs uppercase tracking-widest text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)] rounded-2xl transition-all">Batal</button>
              <button type="submit" disabled={saving} className="px-10 py-4 bg-[var(--primary)] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-95 transition-all">Simpan Perubahan</button>
           </div>
        </form>
      ) : (
        <div className="space-y-10">
           {/* Profile Hero */}
           <section className="bg-[var(--surface-container-lowest)] rounded-[48px] border border-[var(--outline-variant)] p-12 shadow-sm flex flex-col md:flex-row items-center gap-12 text-center md:text-left">
              <div className="w-40 h-40 rounded-[48px] bg-[var(--primary)] border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden flex-shrink-0 relative group">
                 {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <span className="text-6xl font-black text-white">{profile?.nama_lengkap?.charAt(0)}</span>}
                 <button onClick={() => setIsEditing(true)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-[32px]">edit</span>
                 </button>
              </div>
              <div className="flex-1 space-y-6">
                 <div>
                    <h2 className="text-[32px] font-black text-[var(--on-surface)] tracking-tight leading-tight">{profile?.nama_lengkap}</h2>
                    <div className="flex flex-wrap gap-3 mt-3 justify-center md:justify-start">
                       <span className="px-4 py-1.5 bg-[var(--secondary-container)] text-[var(--on-secondary-container)] rounded-full text-[10px] font-black uppercase tracking-widest border border-[var(--secondary)]/10">Mahasiswa Magang</span>
                       <span className="px-4 py-1.5 bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] rounded-full text-[10px] font-black uppercase tracking-widest border border-[var(--outline-variant)]/20">{profile?.nim}</span>
                    </div>
                 </div>
                 <p className="text-[15px] font-medium text-[var(--on-surface-variant)] max-w-xl leading-relaxed">
                   {profile?.bio || 'Mahasiswa magang yang berdedikasi untuk memberikan kontribusi terbaik di unit penempatan.'}
                 </p>
              </div>
           </section>

           {/* Info Cards */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-[var(--surface-container-lowest)] rounded-[40px] border border-[var(--outline-variant)] overflow-hidden shadow-sm">
                 <div className="p-8 border-b border-[var(--outline-variant)]/30 bg-[var(--surface-container-low)]/50">
                    <h3 className="text-[14px] font-black text-[var(--on-surface)] uppercase tracking-widest flex items-center gap-3">
                       <span className="material-symbols-outlined text-[20px] text-[var(--primary)]">school</span>
                       Data Akademik
                    </h3>
                 </div>
                 <div className="p-8 space-y-8">
                    <div className="flex items-start gap-4">
                       <span className="material-symbols-outlined text-[var(--outline)] mt-1">mail</span>
                       <div>
                          <p className="text-[10px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest">Email Terdaftar</p>
                          <p className="text-[14px] font-bold text-[var(--on-surface)]">{email}</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-4">
                       <span className="material-symbols-outlined text-[var(--outline)] mt-1">account_balance</span>
                       <div>
                          <p className="text-[10px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest">Universitas & Prodi</p>
                          <p className="text-[14px] font-bold text-[var(--on-surface)]">{profile?.universitas} • {profile?.prodi}</p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bg-[var(--surface-container-lowest)] rounded-[40px] border border-[var(--outline-variant)] overflow-hidden shadow-sm">
                 <div className="p-8 border-b border-[var(--outline-variant)]/30 bg-[var(--surface-container-low)]/50">
                    <h3 className="text-[14px] font-black text-[var(--on-surface)] uppercase tracking-widest flex items-center gap-3">
                       <span className="material-symbols-outlined text-[20px] text-[var(--tertiary)]">business_center</span>
                       Penempatan Magang
                    </h3>
                 </div>
                 <div className="p-8 space-y-8">
                    <div className="flex items-start gap-4">
                       <span className="material-symbols-outlined text-[var(--outline)] mt-1">corporate_fare</span>
                       <div>
                          <p className="text-[10px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest">Instansi & Unit</p>
                          <p className="text-[14px] font-bold text-[var(--on-surface)]">{profile?.instansi_magang} — {profile?.unit_magang}</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-4">
                       <span className="material-symbols-outlined text-[var(--outline)] mt-1">event</span>
                       <div>
                          <p className="text-[10px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest">Masa Magang</p>
                          <p className="text-[14px] font-bold text-[var(--on-surface)]">{profile?.tanggal_mulai} s/d {profile?.tanggal_selesai}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Danger Zone */}
           <div className="flex flex-col md:flex-row gap-6">
              <button onClick={handleLogout} className="flex-1 p-6 bg-white border border-[var(--error)]/20 rounded-[32px] text-[var(--error)] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[var(--error-container)] transition-all active:scale-95">
                 <span className="material-symbols-outlined">logout</span>
                 Keluar dari Aplikasi
              </button>
              <button onClick={() => setShowDosenModal(true)} className="flex-1 p-6 bg-[var(--inverse-surface)] border border-transparent rounded-[32px] text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] transition-all active:scale-95">
                 <span className="material-symbols-outlined">admin_panel_settings</span>
                 Mode Verifikasi Dosen
              </button>
           </div>
        </div>
      )}

      {/* Modal M3 Style */}
      {showDosenModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--on-surface)]/40 backdrop-blur-md" onClick={() => setShowDosenModal(false)} />
          <div className="bg-white w-full max-w-sm rounded-[48px] shadow-2xl relative z-10 overflow-hidden animate-[fade-in_0.3s_ease-out]">
            <form onSubmit={handleDosenCodeSubmit} className="p-10 space-y-8 text-center">
              <div className="w-20 h-20 bg-[var(--primary-container)] rounded-3xl flex items-center justify-center mx-auto text-[var(--primary)]">
                 <span className="material-symbols-outlined text-[40px]">key</span>
              </div>
              <div>
                <h3 className="text-[20px] font-black text-[var(--on-surface)]">Verifikasi Akses</h3>
                <p className="text-[12px] font-medium text-[var(--on-surface-variant)] mt-2">Gunakan kode otorisasi untuk beralih ke hak akses dosen pembimbing.</p>
              </div>
              <input type="password" value={dosenCode} onChange={e => setDosenCode(e.target.value)} placeholder="Kode Otoritas" className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)]/50 rounded-2xl px-6 py-4 text-center font-black tracking-[8px] outline-none focus:border-[var(--primary)] transition-all" autoFocus />
              {modalError && <p className="text-[10px] font-black text-[var(--error)] uppercase">{modalError}</p>}
              <div className="flex gap-4">
                 <button type="button" onClick={() => setShowDosenModal(false)} className="flex-1 py-4 font-black text-xs uppercase tracking-widest text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)] rounded-xl">Batal</button>
                 <button type="submit" disabled={modalLoading} className="flex-1 py-4 bg-[var(--primary)] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100">{modalLoading ? '...' : 'Verifikasi'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
