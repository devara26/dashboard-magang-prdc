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
      await exportLaporanExcel(profile).finally(() => setDownloadingExcel(false))
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
    <div className="space-y-10 pb-20 max-w-5xl mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-[28px] font-black tracking-tight text-[var(--text-main)]">Profile Account</h1>
           <p className="text-[14px] font-medium text-[var(--text-muted)]">Personalize your internship identity</p>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={handleDownloadExcel} className="flex items-center gap-2 px-6 py-3 bg-white border border-[var(--border)] rounded-xl text-[13px] font-black text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-all">
              <span className="material-symbols-outlined text-[20px]">download</span>
              {downloadingExcel ? 'Wait...' : 'Export Info'}
           </button>
           {!isEditing && (
             <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-white rounded-xl text-[13px] font-black hover:opacity-90 shadow-lg shadow-blue-100 transition-all">
                <span className="material-symbols-outlined text-[20px]">edit</span>
                Edit Profile
             </button>
           )}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="bento-card p-12 space-y-12 animate-slide-up">
           <div className="flex flex-col items-center gap-6">
              <div className="relative">
                 <div className="w-32 h-32 rounded-[var(--radius-xl)] bg-[var(--accent)] border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden">
                    {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <span className="text-5xl font-black text-white">{profile?.nama_lengkap?.charAt(0)}</span>}
                    {uploadingAvatar && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>}
                 </div>
                 <label className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-[var(--accent)] cursor-pointer hover:scale-110 transition-transform border border-[var(--border)]">
                    <span className="material-symbols-outlined">add_a_photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                 </label>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-8">
                 <h3 className="text-[12px] font-black text-[var(--text-light)] uppercase tracking-[2px] px-2">Academic Data</h3>
                 <div className="space-y-5">
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-[var(--text-light)] uppercase tracking-widest ml-1">Full Name</label>
                       <input value={form.nama_lengkap || ''} onChange={e => setForm({...form, nama_lengkap: e.target.value})} className="w-full bg-[var(--bg-app)] border border-[var(--border)] rounded-xl px-5 py-4 text-sm font-semibold outline-none focus:border-[var(--accent)] focus:bg-white transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-[var(--text-light)] uppercase tracking-widest ml-1">ID Number (NIM)</label>
                       <input value={form.nim || ''} onChange={e => setForm({...form, nim: e.target.value})} className="w-full bg-[var(--bg-app)] border border-[var(--border)] rounded-xl px-5 py-4 text-sm font-semibold outline-none focus:border-[var(--accent)] focus:bg-white transition-all" />
                    </div>
                 </div>
              </div>
              <div className="space-y-8">
                 <h3 className="text-[12px] font-black text-[var(--text-light)] uppercase tracking-[2px] px-2">Internship Details</h3>
                 <div className="space-y-5">
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-[var(--text-light)] uppercase tracking-widest ml-1">Company / Agency</label>
                       <input value={form.instansi_magang || ''} onChange={e => setForm({...form, instansi_magang: e.target.value})} className="w-full bg-[var(--bg-app)] border border-[var(--border)] rounded-xl px-5 py-4 text-sm font-semibold outline-none focus:border-[var(--accent)] focus:bg-white transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-[var(--text-light)] uppercase tracking-widest ml-1">Unit / Division</label>
                       <input value={form.unit_magang || ''} onChange={e => setForm({...form, unit_magang: e.target.value})} className="w-full bg-[var(--bg-app)] border border-[var(--border)] rounded-xl px-5 py-4 text-sm font-semibold outline-none focus:border-[var(--accent)] focus:bg-white transition-all" />
                    </div>
                 </div>
              </div>
           </div>

           <div className="flex justify-end gap-4 pt-10 border-t border-[var(--border-light)]">
              <button type="button" onClick={() => setIsEditing(false)} className="px-8 py-4 font-black text-xs uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--bg-app)] rounded-xl transition-all">Cancel</button>
              <button type="submit" disabled={saving} className="px-10 py-4 bg-[var(--text-main)] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-100 hover:bg-[var(--accent)] transition-all">
                 {saving ? 'Saving...' : 'Save Changes'}
              </button>
           </div>
        </form>
      ) : (
        <div className="space-y-8 animate-slide-up">
           {/* Profile Header Card */}
           <section className="bento-card p-10 flex flex-col md:flex-row items-center gap-10 text-center md:text-left relative overflow-hidden">
              <div className="absolute right-0 top-0 w-64 h-64 bg-[var(--bg-app)] rounded-full -mr-32 -mt-32"></div>
              <div className="w-32 h-32 rounded-[var(--radius-xl)] bg-[var(--accent)] border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden flex-shrink-0 relative group">
                 {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <span className="text-5xl font-black text-white">{profile?.nama_lengkap?.charAt(0)}</span>}
                 <button onClick={() => setIsEditing(true)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-[28px]">edit</span>
                 </button>
              </div>
              <div className="flex-1 space-y-4 relative z-10">
                 <div>
                    <h2 className="text-[32px] font-black text-[var(--text-main)] tracking-tight leading-tight">{profile?.nama_lengkap}</h2>
                    <div className="flex flex-wrap gap-3 mt-3 justify-center md:justify-start">
                       <span className="px-4 py-1.5 bg-[var(--accent-soft)] text-[var(--accent)] rounded-full text-[10px] font-black uppercase tracking-widest border border-[var(--accent)]/10">Active Intern</span>
                       <span className="px-4 py-1.5 bg-[var(--bg-app)] text-[var(--text-muted)] rounded-full text-[10px] font-black uppercase tracking-widest border border-[var(--border)]">{profile?.nim}</span>
                    </div>
                 </div>
                 <p className="text-[14px] font-medium text-[var(--text-muted)] max-w-xl leading-relaxed">
                   {profile?.bio || 'Documenting an incredible internship journey through the Boltshift platform.'}
                 </p>
              </div>
           </section>

           {/* Bento Info Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bento-card space-y-8">
                 <h3 className="text-[12px] font-black text-[var(--text-light)] uppercase tracking-[2px] px-2">Account Info</h3>
                 <div className="space-y-6">
                    <div className="flex items-center gap-5 p-5 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-light)]">
                       <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[var(--accent)] shadow-sm">
                          <span className="material-symbols-outlined">alternate_email</span>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-[var(--text-light)] uppercase tracking-widest">Email Address</p>
                          <p className="text-[15px] font-bold text-[var(--text-main)]">{email}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-5 p-5 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-light)]">
                       <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-orange-500 shadow-sm">
                          <span className="material-symbols-outlined">school</span>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-[var(--text-light)] uppercase tracking-widest">Institution</p>
                          <p className="text-[15px] font-bold text-[var(--text-main)]">{profile?.universitas} • {profile?.prodi}</p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bento-card space-y-8">
                 <h3 className="text-[12px] font-black text-[var(--text-light)] uppercase tracking-[2px] px-2">Placement Info</h3>
                 <div className="space-y-6">
                    <div className="flex items-center gap-5 p-5 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-light)]">
                       <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                          <span className="material-symbols-outlined">corporate_fare</span>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-[var(--text-light)] uppercase tracking-widest">Company & Unit</p>
                          <p className="text-[15px] font-bold text-[var(--text-main)]">{profile?.instansi_magang} — {profile?.unit_magang}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-5 p-5 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-light)]">
                       <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
                          <span className="material-symbols-outlined">event_note</span>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-[var(--text-light)] uppercase tracking-widest">Period</p>
                          <p className="text-[15px] font-bold text-[var(--text-main)]">{profile?.tanggal_mulai} to {profile?.tanggal_selesai}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Actions Area */}
           <div className="flex flex-col md:flex-row gap-6">
              <button onClick={() => setShowDosenModal(true)} className="flex-1 p-6 bg-[var(--text-main)] border border-transparent rounded-[var(--radius-lg)] text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[var(--accent)] transition-all shadow-xl shadow-slate-100">
                 <span className="material-symbols-outlined">admin_panel_settings</span>
                 Switch to Supervisor Role
              </button>
              <button onClick={handleLogout} className="flex-1 p-6 bg-white border border-red-100 rounded-[var(--radius-lg)] text-red-600 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-50 transition-all">
                 <span className="material-symbols-outlined">logout</span>
                 Logout from Account
              </button>
           </div>
        </div>
      )}

      {/* Modal - SaaS Minimalist */}
      {showDosenModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowDosenModal(false)} />
          <div className="bg-white w-full max-w-sm rounded-[var(--radius-xl)] shadow-2xl relative z-10 overflow-hidden animate-slide-up">
            <form onSubmit={handleDosenCodeSubmit} className="p-10 space-y-8 text-center">
              <div className="w-20 h-20 bg-[var(--bg-app)] rounded-3xl flex items-center justify-center mx-auto text-[var(--accent)]">
                 <span className="material-symbols-outlined text-[40px]">shield_person</span>
              </div>
              <div>
                <h3 className="text-[20px] font-black text-[var(--text-main)]">Access Verification</h3>
                <p className="text-[12px] font-medium text-[var(--text-muted)] mt-2">Enter your authority code to switch to supervisor access.</p>
              </div>
              <input type="password" value={dosenCode} onChange={e => setDosenCode(e.target.value)} placeholder="••••••" className="w-full bg-[var(--bg-app)] border border-[var(--border)] rounded-2xl px-6 py-4 text-center font-black tracking-[12px] text-lg outline-none focus:border-[var(--accent)] transition-all" autoFocus />
              {modalError && <p className="text-[10px] font-black text-red-500 uppercase">{modalError}</p>}
              <div className="flex gap-4">
                 <button type="button" onClick={() => setShowDosenModal(false)} className="flex-1 py-4 font-black text-xs uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--bg-app)] rounded-xl transition-all">Close</button>
                 <button type="submit" disabled={modalLoading} className="flex-1 py-4 bg-[var(--accent)] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 transition-all">Verify</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
