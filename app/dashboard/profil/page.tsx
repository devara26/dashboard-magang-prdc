'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User, Mail, CreditCard, Building, Building2, LogOut, ShieldCheck, ChevronLeft, Edit2, Save, X, Calendar, GraduationCap, Info } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

type Profile = {
  id: string
  nama_lengkap: string
  nim: string
  instansi_magang: string
  unit_magang: string
  universitas: string
  prodi: string
  tanggal_mulai: string
  tanggal_selesai: string
  bio: string
}

export default function ProfilPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Profile>>({})

  useEffect(() => {
    fetchUser()
  }, [])

  async function fetchUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setEmail(user.email || '')

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile(data)
      setForm(data)
    }
    setLoading(false)
  }

  async function handleLogout() {
    if (confirm('Apakah Anda yakin ingin keluar dari aplikasi?')) {
      await supabase.auth.signOut()
      router.push('/login')
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (!profile?.id) throw new Error('Profil tidak ditemukan')

      const { error } = await supabase
        .from('profiles')
        .update({
          nama_lengkap: form.nama_lengkap,
          nim: form.nim,
          universitas: form.universitas,
          prodi: form.prodi,
          instansi_magang: form.instansi_magang,
          unit_magang: form.unit_magang,
          tanggal_mulai: form.tanggal_mulai,
          tanggal_selesai: form.tanggal_selesai,
          bio: form.bio,
        })
        .eq('id', profile.id)

      if (error) throw error

      setProfile({ ...profile, ...form } as Profile)
      setIsEditing(false)
      toast.success('Profil berhasil diperbarui')
    } catch (error) {
      console.error(error)
      toast.error('Gagal memperbarui profil')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-zinc-500 text-sm font-medium animate-pulse">Memuat profil pengguna...</p>
      </div>
    </div>
  )

  return (
    <div className="pb-12 animate-[fade-in_0.7s_ease-out] max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium mb-6">
            <ChevronLeft className="w-4 h-4" /> Kembali ke Beranda
          </Link>
          <div className="relative">
            <div className="absolute -top-10 -left-10 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2 relative z-10 flex items-center gap-3">
              <User className="w-8 h-8 text-amber-400" />
              Profil <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Pengguna</span>
            </h1>
            <p className="text-zinc-400 text-base relative z-10">
              Informasi detail mengenai data diri magang Anda
            </p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all border border-zinc-700 hover:border-zinc-600 shadow-lg active:scale-95"
          >
            <Edit2 className="w-4 h-4" /> Edit Profil
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="bg-zinc-900/50 backdrop-blur-sm border border-amber-500/30 rounded-3xl p-8 mb-8 relative animate-[fade-in_0.3s_ease-out]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 space-y-8">
            <h2 className="text-xl font-semibold text-white border-b border-zinc-800 pb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-amber-400" /> Mode Edit Profil
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Data Diri */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-amber-400 uppercase tracking-wider mb-2">Data Pribadi</h3>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    value={form.nama_lengkap || ''}
                    onChange={e => setForm({ ...form, nama_lengkap: e.target.value })}
                    required
                    className="w-full bg-zinc-950 text-white rounded-xl px-4 py-3 text-sm border border-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">NIM / NIK</label>
                  <input
                    type="text"
                    value={form.nim || ''}
                    onChange={e => setForm({ ...form, nim: e.target.value })}
                    className="w-full bg-zinc-950 text-white rounded-xl px-4 py-3 text-sm border border-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Universitas / Asal Instansi</label>
                  <input
                    type="text"
                    value={form.universitas || ''}
                    onChange={e => setForm({ ...form, universitas: e.target.value })}
                    className="w-full bg-zinc-950 text-white rounded-xl px-4 py-3 text-sm border border-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Program Studi / Jurusan</label>
                  <input
                    type="text"
                    value={form.prodi || ''}
                    onChange={e => setForm({ ...form, prodi: e.target.value })}
                    className="w-full bg-zinc-950 text-white rounded-xl px-4 py-3 text-sm border border-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>
              </div>

              {/* Data Magang */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-amber-400 uppercase tracking-wider mb-2">Data Magang</h3>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Instansi Tempat Magang</label>
                  <input
                    type="text"
                    value={form.instansi_magang || ''}
                    onChange={e => setForm({ ...form, instansi_magang: e.target.value })}
                    className="w-full bg-zinc-950 text-white rounded-xl px-4 py-3 text-sm border border-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Unit / Divisi Magang (Posisi)</label>
                  <input
                    type="text"
                    value={form.unit_magang || ''}
                    onChange={e => setForm({ ...form, unit_magang: e.target.value })}
                    className="w-full bg-zinc-950 text-white rounded-xl px-4 py-3 text-sm border border-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tanggal Mulai</label>
                    <input
                      type="date"
                      value={form.tanggal_mulai || ''}
                      onChange={e => setForm({ ...form, tanggal_mulai: e.target.value })}
                      className="w-full bg-zinc-950 text-white rounded-xl px-4 py-3 text-sm border border-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tanggal Selesai</label>
                    <input
                      type="date"
                      value={form.tanggal_selesai || ''}
                      onChange={e => setForm({ ...form, tanggal_selesai: e.target.value })}
                      className="w-full bg-zinc-950 text-white rounded-xl px-4 py-3 text-sm border border-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Keterangan Lain */}
            <div>
              <h3 className="text-sm font-medium text-amber-400 uppercase tracking-wider mb-4">Informasi Tambahan</h3>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Keterangan Lain / Bio Ringkas</label>
                <textarea
                  value={form.bio || ''}
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  placeholder="Tambahkan catatan khusus, keahlian, atau keterangan magang lainnya..."
                  className="w-full bg-zinc-950 text-white rounded-xl px-4 py-3 text-sm border border-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800/50">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setForm(profile || {})
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-white text-sm font-medium px-8 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center gap-2"
              >
                {saving ? 'Menyimpan...' : (
                  <>
                    <Save className="w-4 h-4" /> Simpan Profil
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* Profile View Section */
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-3xl p-1 overflow-hidden hover:border-zinc-700/50 transition-all mb-8 relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="bg-zinc-950/50 rounded-[22px] p-8 md:p-10 relative z-10">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center mb-10 pb-10 border-b border-zinc-800/50">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-1 shadow-xl shadow-amber-500/20 flex-shrink-0">
                <div className="w-full h-full bg-zinc-950 rounded-xl flex items-center justify-center">
                  <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-orange-500">
                    {profile?.nama_lengkap?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{profile?.nama_lengkap || 'User Magang'}</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-sm font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Magang {profile?.instansi_magang ? `di ${profile.instansi_magang}` : ''}
                  </span>
                  <span className="px-3 py-1 bg-zinc-800/80 text-zinc-300 border border-zinc-700 rounded-full text-sm font-medium flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> {profile?.unit_magang || 'Belum ada unit'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-6">
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" /> Nama Lengkap
                  </p>
                  <p className="text-lg font-medium text-white">{profile?.nama_lengkap || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> NIM / NIK
                  </p>
                  <p className="text-lg font-medium text-white">{profile?.nim || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email Pengguna
                  </p>
                  <p className="text-lg font-medium text-white">{email || '-'}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" /> Universitas / Asal Instansi
                  </p>
                  <p className="text-lg font-medium text-white">
                    {profile?.universitas || '-'} {profile?.prodi ? `(${profile.prodi})` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Building className="w-4 h-4" /> Tempat Magang
                  </p>
                  <p className="text-lg font-medium text-white">{profile?.instansi_magang || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Periode Magang
                  </p>
                  <p className="text-lg font-medium text-white">
                    {profile?.tanggal_mulai || '?'} <span className="text-zinc-500 text-sm mx-1">s/d</span> {profile?.tanggal_selesai || '?'}
                  </p>
                </div>
              </div>
            </div>

            {profile?.bio && (
              <div className="pt-6 border-t border-zinc-800/50">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Keterangan Tambahan
                </p>
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                  <p className="text-zinc-300 whitespace-pre-wrap text-sm leading-relaxed">{profile.bio}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions Section */}
      <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-rose-400 font-semibold mb-1">Keluar Aplikasi</h3>
          <p className="text-zinc-500 text-sm">Sesi Anda akan diakhiri dan Anda harus login kembali.</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full sm:w-auto bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/20 font-medium px-6 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-rose-500/20 active:scale-95 flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout Sekarang
        </button>
      </div>
    </div>
  )
}
