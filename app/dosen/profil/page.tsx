'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User, Mail, CreditCard, LogOut, Edit2, Save, X, Camera, Users, Trash2, Plus, Search, Eye } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

  universitas: string | null
  max_mahasiswa: number
  avatar_url: string | null
}

type MahasiswaBimbingan = {
  id: string
  nama_lengkap: string
  nim: string
  universitas: string
  instansi_magang: string
  enrollment_date: string | null
  progress: number
}

export default function DosenProfilPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<DosenProfile | null>(null)
  const [email, setEmail] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<DosenProfile>>({})
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  
  const [mahasiswa, setMahasiswa] = useState<MahasiswaBimbingan[]>([])
  
  const [showTambahModal, setShowTambahModal] = useState(false)
  const [searchMahasiswa, setSearchMahasiswa] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    fetchUser()
  }, [])

  async function fetchUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email || '')

      const { data, error } = await supabase
        .from('profiles')
        .select('id, nama_lengkap, nip, department, faculty, universitas, max_mahasiswa, avatar_url')
        .eq('id', user.id)
        .single()

      if (error) throw error
      if (data) {
        setProfile({ ...data, max_mahasiswa: data.max_mahasiswa || 10 })
        setForm({ ...data, max_mahasiswa: data.max_mahasiswa || 10 })
        setAvatarUrl(data.avatar_url)
      }

      // Fetch Mahasiswa Bimbingan
      await fetchMahasiswa(user.id)

    } catch (error: any) {
      toast.error('Gagal memuat profil: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchMahasiswa(dosenId: string) {
    const { data: mhsData } = await supabase
      .from('profiles')
      .select('id, nama_lengkap, nim, universitas, instansi_magang, enrollment_date, tanggal_mulai, tanggal_selesai')
      .eq('role', 'mahasiswa')
      .eq('dosen_id', dosenId)
      .order('enrollment_date', { ascending: false })

    if (mhsData) {
      const { data: absensiData } = await supabase.from('absensi').select('mahasiswa_id, status')

      const mhsList = mhsData.map(m => {
        const hadir = absensiData?.filter(a => a.mahasiswa_id === m.id && a.status === 'Hadir').length || 0
        const start = m.tanggal_mulai ? new Date(m.tanggal_mulai) : null
        const end = m.tanggal_selesai ? new Date(m.tanggal_selesai) : null
        
        let target = 150
        if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
          target = 0
          let current = new Date(start)
          while (current <= end) {
            const day = current.getDay()
            if (day !== 0 && day !== 6) target++
            current.setDate(current.getDate() + 1)
          }
        }
        
        const progress = target > 0 ? Math.min(Math.round((hadir / target) * 100), 100) : 0
        return { ...m, progress }
      })
      setMahasiswa(mhsList)
    }
  }

  async function handleSearchMahasiswa() {
    if (!searchMahasiswa.trim()) return
    setSearching(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nama_lengkap, nim, universitas')
        .eq('role', 'mahasiswa')
        .is('dosen_id', null)
        .ilike('nama_lengkap', `%${searchMahasiswa}%`)
        .limit(10)

      if (error) throw error
      setSearchResults(data || [])
    } catch (error: any) {
      toast.error('Gagal mencari mahasiswa: ' + error.message)
    } finally {
      setSearching(false)
    }
  }

  async function handleAddMahasiswa(mhsId: string) {
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('profiles')
        .update({ dosen_id: profile?.id, enrollment_date: now })
        .eq('id', mhsId)

      if (error) throw error
      toast.success('Mahasiswa berhasil ditambahkan')
      setShowTambahModal(false)
      setSearchMahasiswa('')
      setSearchResults([])
      if (profile?.id) fetchMahasiswa(profile.id)
    } catch (error: any) {
      toast.error('Gagal menambahkan mahasiswa: ' + error.message)
    }
  }

  async function handleRemoveMahasiswa(mhsId: string, nama: string) {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${nama} dari daftar bimbingan?`)) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ dosen_id: null, enrollment_date: null })
        .eq('id', mhsId)

      if (error) throw error
      toast.success('Mahasiswa berhasil dihapus')
      if (profile?.id) fetchMahasiswa(profile.id)
    } catch (error: any) {
      toast.error('Gagal menghapus mahasiswa: ' + error.message)
    }
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

      const { data, error } = await supabase
        .from('profiles')
        .update({
          nama_lengkap: form.nama_lengkap,
          nip: form.nip,
          department: form.department,
          faculty: form.faculty,
          universitas: form.universitas,
          max_mahasiswa: form.max_mahasiswa,
        })
        .eq('id', profile.id)
        .select()

      if (error) throw error
      setProfile({ ...profile, ...form } as DosenProfile)
      setIsEditing(false)
      toast.success('Profil berhasil diperbarui')
    } catch (error: any) {
      console.error(error)
      toast.error('Gagal memperbarui profil: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    // Optimistic UI
    const previewUrl = URL.createObjectURL(file)
    const oldAvatarUrl = avatarUrl
    setAvatarUrl(previewUrl)
    setUploadingAvatar(true)

    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${profile.id}-${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setAvatarUrl(publicUrl)
      toast.success('Foto profil berhasil diperbarui')
    } catch (error: any) {
      console.error(error)
      setAvatarUrl(oldAvatarUrl) // Revert on error
      toast.error('Gagal mengunggah foto: ' + (error.message || 'Error tidak diketahui'))
    } finally {
      setUploadingAvatar(false)
    }
  }

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#137333] rounded-full animate-spin"></div>
        <p className="text-[#5F6368] text-sm font-medium animate-pulse">Memuat profil dosen...</p>
      </div>
    </div>
  )

  return (
    <div className="pb-12 animate-[fade-in_0.7s_ease-out] max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#202124]">Profil Dosen</h1>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-2xl p-8 mb-8 shadow-sm">
          <div className="space-y-8">
            <h2 className="text-xl font-medium text-[#202124] border-b border-gray-200 pb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[#137333]" /> Edit Profil Dosen
            </h2>

            {/* Avatar Edit */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-[#137333] flex-shrink-0 flex items-center justify-center shadow-md border-4 border-white overflow-hidden relative group">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-normal text-white">
                      {profile?.nama_lengkap?.charAt(0).toUpperCase() || 'D'}
                    </span>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-sm border border-gray-100 text-[#137333] hover:bg-gray-50 transition-colors cursor-pointer">
                  <Camera className="w-4 h-4" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    disabled={uploadingAvatar}
                    onChange={handleAvatarUpload}
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#5F6368] mb-2">Nama Lengkap</label>
                <input
                  type="text"
                  value={form.nama_lengkap || ''}
                  onChange={e => setForm({ ...form, nama_lengkap: e.target.value })}
                  required
                  className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#137333] focus:ring-1 focus:ring-[#137333]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6368] mb-2">NIP</label>
                <input
                  type="text"
                  value={form.nip || ''}
                  onChange={e => setForm({ ...form, nip: e.target.value })}
                  className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#137333] focus:ring-1 focus:ring-[#137333]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6368] mb-2">Universitas</label>
                <input
                  type="text"
                  value={form.universitas || ''}
                  onChange={e => setForm({ ...form, universitas: e.target.value })}
                  className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#137333] focus:ring-1 focus:ring-[#137333]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6368] mb-2">Fakultas</label>
                <input
                  type="text"
                  value={form.faculty || ''}
                  onChange={e => setForm({ ...form, faculty: e.target.value })}
                  className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#137333] focus:ring-1 focus:ring-[#137333]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6368] mb-2">Departemen / Prodi</label>
                <input
                  type="text"
                  value={form.department || ''}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                  className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#137333] focus:ring-1 focus:ring-[#137333]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6368] mb-2">Maksimal Mahasiswa</label>
                <input
                  type="number"
                  min="1"
                  value={form.max_mahasiswa || 10}
                  onChange={e => setForm({ ...form, max_mahasiswa: parseInt(e.target.value) })}
                  className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#137333] focus:ring-1 focus:ring-[#137333]"
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
                className="px-5 py-2.5 rounded-full text-sm font-medium text-[#5F6368] hover:bg-gray-100 flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#137333] hover:bg-[#0D652D] disabled:opacity-50 text-white text-sm font-medium px-8 py-2.5 rounded-full flex items-center gap-2"
              >
                {saving ? 'Menyimpan...' : <><Save className="w-4 h-4" /> Simpan Profil</>}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 relative max-w-3xl mx-auto">
          <div className="relative z-10 flex flex-col items-center mb-10 text-center">
            <div className="relative mb-4">
              <div className="w-28 h-28 rounded-full bg-[#137333] flex-shrink-0 flex items-center justify-center shadow-md border-4 border-white overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl font-normal text-white">
                    {profile?.nama_lengkap?.charAt(0).toUpperCase() || 'D'}
                  </span>
                )}
              </div>
              <button 
                onClick={() => setIsEditing(true)} 
                className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-sm border border-gray-100 text-[#137333] hover:bg-gray-50 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-2xl font-bold text-[#202124] mb-2">{profile?.nama_lengkap || 'Dosen'}</h2>
            <div className="flex items-center gap-2">
              <span className="px-4 py-1.5 bg-[#E6F4EA] text-[#137333] rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                DOSEN PEMBIMBING
              </span>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
            <h3 className="px-6 py-4 text-sm font-bold text-[#202124] bg-gray-50/50 border-b border-gray-100">Informasi Pribadi</h3>
            <div className="divide-y divide-gray-100">
              <div className="px-6 py-4 flex items-center gap-4">
                <div className="p-2.5 bg-[#F8F9FA] rounded-full text-[#5F6368]"><CreditCard className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs text-[#5F6368] font-medium mb-0.5">NIP</p>
                  <p className="text-sm font-medium text-[#202124]">{profile?.nip || '-'}</p>
                </div>
              </div>
              <div className="px-6 py-4 flex items-center gap-4">
                <div className="p-2.5 bg-[#F8F9FA] rounded-full text-[#5F6368]"><Mail className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs text-[#5F6368] font-medium mb-0.5">Email Pengguna</p>
                  <p className="text-sm font-medium text-[#202124]">{email}</p>
                </div>
              </div>
              <div className="px-6 py-4 flex items-center gap-4">
                <div className="p-2.5 bg-[#F8F9FA] rounded-full text-[#5F6368]"><User className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs text-[#5F6368] font-medium mb-0.5">Departemen / Fakultas</p>
                  <p className="text-sm font-medium text-[#202124]">{profile?.department || '-'} / {profile?.faculty || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mahasiswa Bimbingan Section */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#137333]" /> Mahasiswa Bimbingan
                <span className="bg-[#E6F4EA] text-[#137333] px-2 py-0.5 rounded text-xs">
                  {mahasiswa.length} / {profile?.max_mahasiswa}
                </span>
              </h3>
              <button
                onClick={() => setShowTambahModal(true)}
                disabled={mahasiswa.length >= (profile?.max_mahasiswa || 10)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#137333] text-white hover:bg-[#0D652D] disabled:opacity-50 rounded-lg text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Mahasiswa
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#F8F9FA] text-[#5F6368] font-medium border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3">Nama / NIM</th>
                    <th className="px-6 py-3">Universitas</th>
                    <th className="px-6 py-3">Tgl Terdaftar</th>
                    <th className="px-6 py-3">Progress</th>
                    <th className="px-6 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mahasiswa.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[#5F6368]">Belum ada mahasiswa bimbingan.</td>
                    </tr>
                  ) : (
                    mahasiswa.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F8F9FA] transition-colors group">
                        <td className="px-6 py-3">
                          <p className="font-bold text-[#202124]">{m.nama_lengkap}</p>
                          <p className="text-xs text-[#5F6368]">{m.nim}</p>
                        </td>
                        <td className="px-6 py-3 text-[#5F6368]">{m.universitas || '-'}</td>
                        <td className="px-6 py-3 text-[#5F6368]">
                          {m.enrollment_date ? new Date(m.enrollment_date).toLocaleDateString('id-ID') : '-'}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full ${m.progress >= 80 ? 'bg-[#137333]' : m.progress >= 50 ? 'bg-[#FBBC04]' : 'bg-[#EA4335]'}`} style={{ width: `${m.progress}%` }} />
                            </div>
                            <span className="font-medium text-[#202124] text-xs">{m.progress}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right space-x-2">
                          <Link href={`/dosen/mahasiswa/${m.id}`} className="inline-flex p-1.5 bg-[#E8F0FE] text-[#1A73E8] hover:bg-[#D2E3FC] rounded-md transition-colors" title="Lihat Dashboard">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button onClick={() => handleRemoveMahasiswa(m.id, m.nama_lengkap)} className="inline-flex p-1.5 bg-[#FCE8E6] text-[#C5221F] hover:bg-[#FAD2CF] rounded-md transition-colors" title="Hapus Mahasiswa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="mt-8 max-w-3xl mx-auto">
        <button
          onClick={handleLogout}
          className="w-full bg-white hover:bg-gray-50 text-[#C5221F] border border-gray-200 font-bold px-6 py-4 rounded-full transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </div>

      {/* Tambah Mahasiswa Modal */}
      {showTambahModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] animate-[scale-in_0.2s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-[#F8F9FA]">
              <h3 className="font-bold text-[#202124]">Tambah Mahasiswa Bimbingan</h3>
              <button onClick={() => setShowTambahModal(false)} className="p-1 hover:bg-gray-200 rounded-full text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-hidden flex flex-col">
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari nama mahasiswa (tanpa pembimbing)..."
                    value={searchMahasiswa}
                    onChange={e => setSearchMahasiswa(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearchMahasiswa()}
                    className="w-full pl-9 pr-4 py-2 bg-[#F8F9FA] border border-gray-200 rounded-lg text-sm focus:border-[#137333] focus:ring-1 focus:ring-[#137333]"
                  />
                </div>
                <button
                  onClick={handleSearchMahasiswa}
                  disabled={searching}
                  className="px-4 py-2 bg-[#137333] text-white rounded-lg text-sm font-medium hover:bg-[#0D652D] disabled:opacity-50"
                >
                  {searching ? 'Mencari...' : 'Cari'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
                {searchResults.length === 0 ? (
                  <div className="p-8 text-center text-[#5F6368] text-sm">
                    Ketik nama mahasiswa dan klik Cari. Hanya mahasiswa tanpa dosen pembimbing yang akan muncul.
                  </div>
                ) : (
                  searchResults.map(m => (
                    <div key={m.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <p className="font-bold text-[#202124] text-sm">{m.nama_lengkap}</p>
                        <p className="text-xs text-[#5F6368]">{m.nim} • {m.universitas}</p>
                      </div>
                      <button
                        onClick={() => handleAddMahasiswa(m.id)}
                        className="px-3 py-1.5 bg-[#E6F4EA] text-[#137333] rounded-md text-xs font-bold hover:bg-[#CEEAD6]"
                      >
                        Tambah
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
