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
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#FBBC04] rounded-full animate-spin"></div>
        <p className="text-[#5F6368] text-sm font-medium animate-pulse">Memuat profil pengguna...</p>
      </div>
    </div>
  )

  return (
    <div className="pb-12 animate-[fade-in_0.7s_ease-out] max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-[#5F6368] hover:text-[#1A73E8] transition-colors text-sm font-medium mb-6">
            <ChevronLeft className="w-4 h-4" /> Kembali ke Beranda
          </Link>
          <div className="relative">
            <h1 className="text-3xl font-medium tracking-tight text-[#202124] mb-2 relative z-10 flex items-center gap-3">
              <User className="w-8 h-8 text-[#FBBC04]" />
              Profil Pengguna
            </h1>
            <p className="text-[#5F6368] text-base relative z-10">
              Informasi detail mengenai data diri magang Anda
            </p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#5F6368] text-sm font-medium px-5 py-2.5 rounded-full transition-all border border-gray-300 shadow-sm active:scale-95"
          >
            <Edit2 className="w-4 h-4" /> Edit Profil
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-2xl p-8 mb-8 relative animate-[fade-in_0.3s_ease-out] shadow-sm">
          <div className="relative z-10 space-y-8">
            <h2 className="text-xl font-medium text-[#202124] border-b border-gray-200 pb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[#FBBC04]" /> Mode Edit Profil
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Data Diri */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-[#1A73E8] uppercase tracking-wider mb-2">Data Pribadi</h3>
                <div>
                  <label className="block text-sm font-medium text-[#5F6368] mb-2">Nama Lengkap</label>
                  <input
                    type="text"
                    value={form.nama_lengkap || ''}
                    onChange={e => setForm({ ...form, nama_lengkap: e.target.value })}
                    required
                    className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5F6368] mb-2">NIM / NIK</label>
                  <input
                    type="text"
                    value={form.nim || ''}
                    onChange={e => setForm({ ...form, nim: e.target.value })}
                    className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5F6368] mb-2">Universitas / Asal Instansi</label>
                  <input
                    type="text"
                    value={form.universitas || ''}
                    onChange={e => setForm({ ...form, universitas: e.target.value })}
                    className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5F6368] mb-2">Program Studi / Jurusan</label>
                  <input
                    type="text"
                    value={form.prodi || ''}
                    onChange={e => setForm({ ...form, prodi: e.target.value })}
                    className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors"
                  />
                </div>
              </div>

              {/* Data Magang */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-[#1A73E8] uppercase tracking-wider mb-2">Data Magang</h3>
                <div>
                  <label className="block text-sm font-medium text-[#5F6368] mb-2">Instansi Tempat Magang</label>
                  <input
                    type="text"
                    value={form.instansi_magang || ''}
                    onChange={e => setForm({ ...form, instansi_magang: e.target.value })}
                    className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5F6368] mb-2">Unit / Divisi Magang (Posisi)</label>
                  <input
                    type="text"
                    value={form.unit_magang || ''}
                    onChange={e => setForm({ ...form, unit_magang: e.target.value })}
                    className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#5F6368] mb-2">Tanggal Mulai</label>
                    <input
                      type="date"
                      value={form.tanggal_mulai || ''}
                      onChange={e => setForm({ ...form, tanggal_mulai: e.target.value })}
                      className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5F6368] mb-2">Tanggal Selesai</label>
                    <input
                      type="date"
                      value={form.tanggal_selesai || ''}
                      onChange={e => setForm({ ...form, tanggal_selesai: e.target.value })}
                      className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Keterangan Lain */}
            <div>
              <h3 className="text-sm font-medium text-[#1A73E8] uppercase tracking-wider mb-4">Informasi Tambahan</h3>
              <div>
                <label className="block text-sm font-medium text-[#5F6368] mb-2">Keterangan Lain / Bio Ringkas</label>
                <textarea
                  value={form.bio || ''}
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  placeholder="Tambahkan catatan khusus, keahlian, atau keterangan magang lainnya..."
                  className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] resize-none transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setForm(profile || {})
                }}
                className="px-5 py-2.5 rounded-full text-sm font-medium text-[#5F6368] hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#1A73E8] hover:bg-[#1967D2] disabled:opacity-50 text-white text-sm font-medium px-8 py-2.5 rounded-full transition-all shadow-sm active:scale-95 flex items-center gap-2"
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
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-sm transition-shadow mb-8 relative">
          <div className="p-8 md:p-10 relative z-10">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center mb-10 pb-10 border-b border-gray-200">
              <div className="w-24 h-24 rounded-full bg-[#FBBC04] flex-shrink-0 flex items-center justify-center shadow-sm">
                  <span className="text-4xl font-normal text-white">
                    {profile?.nama_lengkap?.charAt(0).toUpperCase() || 'U'}
                  </span>
              </div>
              <div>
                <h2 className="text-2xl font-medium text-[#202124] mb-2">{profile?.nama_lengkap || 'User Magang'}</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-3 py-1 bg-[#FEF7E0] text-[#E37400] border border-[#FEF7E0] rounded-full text-sm font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Magang {profile?.instansi_magang ? `di ${profile.instansi_magang}` : ''}
                  </span>
                  <span className="px-3 py-1 bg-[#F8F9FA] text-[#5F6368] border border-gray-200 rounded-full text-sm font-medium flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> {profile?.unit_magang || 'Belum ada unit'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-6">
                <div>
                  <p className="text-xs text-[#5F6368] font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" /> Nama Lengkap
                  </p>
                  <p className="text-base font-medium text-[#202124]">{profile?.nama_lengkap || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#5F6368] font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> NIM / NIK
                  </p>
                  <p className="text-base font-medium text-[#202124]">{profile?.nim || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#5F6368] font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email Pengguna
                  </p>
                  <p className="text-base font-medium text-[#202124]">{email || '-'}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-xs text-[#5F6368] font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" /> Universitas / Asal Instansi
                  </p>
                  <p className="text-base font-medium text-[#202124]">
                    {profile?.universitas || '-'} {profile?.prodi ? `(${profile.prodi})` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#5F6368] font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Building className="w-4 h-4" /> Tempat Magang
                  </p>
                  <p className="text-base font-medium text-[#202124]">{profile?.instansi_magang || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#5F6368] font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Periode Magang
                  </p>
                  <p className="text-base font-medium text-[#202124]">
                    {profile?.tanggal_mulai || '?'} <span className="text-[#5F6368] text-sm mx-1">s/d</span> {profile?.tanggal_selesai || '?'}
                  </p>
                </div>
              </div>
            </div>

            {profile?.bio && (
              <div className="pt-6 border-t border-gray-200">
                <p className="text-xs text-[#5F6368] font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Keterangan Tambahan
                </p>
                <div className="bg-[#F8F9FA] p-4 rounded-xl border border-gray-200">
                  <p className="text-[#202124] whitespace-pre-wrap text-sm leading-relaxed">{profile.bio}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions Section */}
      <div className="bg-[#FCE8E6] border border-[#FAD2CF] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-[#C5221F] font-medium mb-1">Keluar Aplikasi</h3>
          <p className="text-[#5F6368] text-sm">Sesi Anda akan diakhiri dan Anda harus login kembali.</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full sm:w-auto bg-white hover:bg-gray-50 text-[#C5221F] border border-gray-300 font-medium px-6 py-2.5 rounded-full transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout Sekarang
        </button>
      </div>
    </div>
  )
}
