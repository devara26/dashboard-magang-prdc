'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { List, Plus, Trash2, Calendar, Activity, CheckCircle2, FileText, ChevronRight, AlertCircle, X, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { logAction } from '@/lib/audit'

interface Kegiatan {
  id: string
  tanggal: string
  kegiatan: string
  status: string
  created_at: string
}

type Comment = {
  id: string
  kegiatan_id: number
  user_id: string
  message: string
  created_at: string
  profiles?: {
    nama_lengkap: string
    role: string
  }
}

export default function KegiatanPage() {
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    kegiatan: '',
    status: 'Selesai',
  })

  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState<{ [key: number]: string }>({})
  const [isCommenting, setIsCommenting] = useState<{ [key: number]: boolean }>({})
  const [dosenId, setDosenId] = useState<string | null>(null)

  const [filter, setFilter] = useState({
    keyword: '',
    status: 'Semua',
    date: '',
  })

  useEffect(() => { fetchKegiatan() }, [])

  async function fetchKegiatan() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Sesi tidak ditemukan. Silakan login kembali.')

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('nim, dosen_id')
        .eq('id', user.id)
        .single()
      
      if (profileError) throw new Error('Gagal mengambil data profil.')
      const nim = profile?.nim
      setDosenId(profile?.dosen_id)

      if (nim) {
        const { data, error } = await supabase
          .from('Kegiatan')
          .select('*')
          .eq('nim', nim)
          .order('tanggal', { ascending: false })
        
        if (error) throw error
        setKegiatan(data || [])

        // Fetch Comments
        const { data: commentsData } = await supabase
          .from('comments')
          .select('*, profiles(nama_lengkap, role)')
          .in('kegiatan_id', data?.map(k => k.id) || [])
          .order('created_at', { ascending: true })
        
        setComments(commentsData as any || [])
      } else {
        setKegiatan([])
      }
    } catch (error: any) {
      console.error('Fetch Kegiatan Error:', error)
      toast.error('Gagal memuat daftar kegiatan: ' + (error.message || 'Error koneksi'))
    } finally {
      setLoading(false)
    }
  }

  function handleEditClick(k: Kegiatan) {
    setForm({
      tanggal: k.tanggal,
      kegiatan: k.kegiatan,
      status: k.status,
    })
    setEditingId(k.id)
    setShowForm(true)
  }

  function resetForm() {
    setForm({ tanggal: new Date().toISOString().split('T')[0], kegiatan: '', status: 'Selesai' })
    setEditingId(null)
    setShowForm(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Sesi tidak ditemukan')

      if (editingId) {
        // Mode Edit
        const { data, error } = await supabase.from('Kegiatan').update({
          tanggal: form.tanggal,
          kegiatan: form.kegiatan,
          status: form.status,
        }).eq('id', editingId).select()
        
        if (error) throw error
        if (!data || data.length === 0) {
          throw new Error('Akses ditolak: Gagal mengupdate data. Pastikan pengaturan RLS (Row Level Security) Supabase Anda memperbolehkan operasi UPDATE pada tabel Kegiatan.')
        }
        await logAction('Update Jurnal', `Update jurnal untuk tanggal ${form.tanggal}`, String(editingId))
        toast.success('Jurnal kegiatan berhasil diperbarui')
      } else {
        // Mode Tambah
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('nama_lengkap, nim')
          .eq('id', user.id)
          .single()
        
        if (profileError) throw new Error('Gagal memverifikasi data mahasiswa.')
        const nim = profile?.nim || ''

        // VALIDATION: Check Duplicate Date
        const { data: existing, error: checkError } = await supabase
          .from('Kegiatan')
          .select('id')
          .eq('nim', nim)
          .eq('tanggal', form.tanggal)
          .limit(1)
        
        if (checkError) throw checkError
        if (existing && existing.length > 0) {
          throw new Error(`Jurnal untuk tanggal ${form.tanggal} sudah ada. Silakan edit jurnal yang sudah ada jika ingin mengubahnya.`)
        }

        // VALIDATION: Min Characters
        if (form.kegiatan.length < 50) {
          throw new Error('Deskripsi kegiatan terlalu singkat. Minimal 50 karakter.')
        }

        const { error } = await supabase.from('Kegiatan').insert({
          tanggal: form.tanggal,
          kegiatan: form.kegiatan,
          status: form.status,
          nama_mahasiswa: profile?.nama_lengkap || '',
          nim: nim,
        })
        if (error) throw error
        await logAction('Tambah Jurnal', `Tambah jurnal baru untuk tanggal ${form.tanggal}`)
        toast.success('Jurnal kegiatan berhasil disimpan')
      }

      resetForm()
      fetchKegiatan()
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan jurnal kegiatan. Pastikan data terisi dengan benar.')
      console.error('Submit Kegiatan Error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Hapus log kegiatan ini? Tindakan ini tidak dapat dibatalkan.')) return
    try {
      const { data, error } = await supabase.from('Kegiatan').delete().eq('id', id).select()
      if (error) throw error
      
      if (!data || data.length === 0) {
        throw new Error('Akses ditolak: Tidak dapat menghapus karena pengaturan RLS (Row Level Security) di tabel Kegiatan Anda memblokir aksi DELETE.')
      }
      
      await logAction('Hapus Jurnal', `Hapus jurnal ID: ${id}`)
      toast.success('Kegiatan berhasil dihapus')
      fetchKegiatan()
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus kegiatan')
      console.error(error)
    }
  }

  async function handlePostComment(kegiatanId: number) {
    const message = newComment[kegiatanId]
    if (!message || message.trim() === '') return

    setIsCommenting(prev => ({ ...prev, [kegiatanId]: true }))
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi tidak ditemukan')

      const { data, error } = await supabase.from('comments').insert({
        kegiatan_id: kegiatanId,
        user_id: user.id,
        message: message.trim()
      }).select('*, profiles(nama_lengkap, role)').single()

      if (error) throw error

      setComments(prev => [...prev, data as any])
      setNewComment(prev => ({ ...prev, [kegiatanId]: '' }))
      
      // Trigger Notification for Dosen
      if (dosenId) {
        await supabase.from('notifications').insert({
          user_id: dosenId,
          message: `Mahasiswa memberikan komentar baru pada jurnal kegiatan.`,
          type: 'info',
          is_read: false
        })
      }

      toast.success('Komentar berhasil dikirim')
    } catch (error: any) {
      toast.error('Gagal mengirim komentar: ' + error.message)
    } finally {
      setIsCommenting(prev => ({ ...prev, [kegiatanId]: false }))
    }
  }

  const filteredKegiatan = kegiatan.filter(k => {
    const matchKeyword = k.kegiatan.toLowerCase().includes(filter.keyword.toLowerCase())
    const matchStatus = filter.status === 'Semua' || k.status === filter.status
    const matchDate = filter.date === '' || k.tanggal === filter.date
    return matchKeyword && matchStatus && matchDate
  })

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1A73E8] rounded-full animate-spin"></div>
        <p className="text-[#5F6368] text-sm font-medium animate-pulse">Memuat data kegiatan...</p>
      </div>
    </div>
  )

  return (
    <div className="pb-12 animate-[fade-in_0.7s_ease-out]">
      {/* Header Section */}
      <div className="mb-10 relative">
        <div className="flex flex-col items-center text-center md:flex-row md:justify-between md:items-end md:text-left gap-6 relative z-10">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-[#202124] mb-2 flex flex-col md:flex-row items-center gap-3">
              <List className="w-8 h-8 text-[#1A73E8]" />
              Jurnal Kegiatan
            </h1>
            <p className="text-[#5F6368] text-base">
              Catat dan pantau seluruh aktivitas magang harian Anda
            </p>
          </div>
          <button
            onClick={() => showForm ? resetForm() : setShowForm(true)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors shadow-sm active:scale-95 border ${
              showForm 
                ? 'bg-white hover:bg-gray-50 text-[#5F6368] border-gray-300' 
                : 'bg-[#1A73E8] hover:bg-[#1967D2] text-white border-transparent'
            }`}
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Batal' : 'Tambah Kegiatan'}
          </button>
        </div>
      </div>

      {/* Form Section */}
      {showForm && (
        <div className="mb-8 animate-[fade-in_0.3s_ease-out] relative">
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 relative z-10 hover:shadow-sm transition-shadow">
            <h2 className="text-[#202124] text-lg font-medium mb-6 flex items-center gap-2">
              {editingId ? <Edit2 className="w-5 h-5 text-[#FBBC04]" /> : <FileText className="w-5 h-5 text-[#1A73E8]" />}
              {editingId ? 'Edit Jurnal Kegiatan' : 'Form Tambah Kegiatan'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#5F6368] mb-2">Tanggal Kegiatan</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Calendar className="w-4 h-4 text-[#9AA0A6]" />
                  </div>
                  <input
                    type="date"
                    value={form.tanggal}
                    onChange={e => setForm({ ...form, tanggal: e.target.value })}
                    required
                    className="w-full bg-white text-[#202124] rounded-lg pl-11 pr-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#5F6368] mb-2">Status Pengerjaan</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Activity className="w-4 h-4 text-[#9AA0A6]" />
                  </div>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-white text-[#202124] rounded-lg pl-11 pr-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors appearance-none"
                  >
                    <option value="Selesai">Selesai</option>
                    <option value="Proses">Proses</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-[#5F6368]">Deskripsi / Detail Kegiatan</label>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${form.kegiatan.length >= 50 ? 'bg-[#E6F4EA] text-[#137333]' : 'bg-[#FCE8E6] text-[#C5221F]'}`}>
                  {form.kegiatan.length} / 50 karakter min.
                </span>
              </div>
              <textarea
                value={form.kegiatan}
                onChange={e => setForm({ ...form, kegiatan: e.target.value })}
                required
                rows={4}
                placeholder="Deskripsikan tugas atau pekerjaan yang Anda lakukan hari ini (Minimal 50 karakter)..."
                className={`w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border focus:outline-none focus:ring-1 transition-colors resize-none ${
                  form.kegiatan.length > 0 && form.kegiatan.length < 50 ? 'border-[#EA4335] focus:border-[#EA4335] focus:ring-[#EA4335]' : 'border-gray-300 focus:border-[#1A73E8] focus:ring-[#1A73E8]'
                }`}
              />
              {form.kegiatan.length > 0 && form.kegiatan.length < 50 && (
                <p className="mt-1.5 text-[10px] text-[#EA4335] font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Deskripsi terlalu pendek untuk standar jurnal magang.
                </p>
              )}
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 rounded-full text-sm font-medium text-[#5F6368] hover:bg-gray-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || form.kegiatan.length < 50}
                className={`text-white text-sm font-medium px-8 py-2.5 rounded-full transition-all shadow-sm active:scale-95 flex items-center gap-2 ${
                  editingId
                    ? 'bg-[#FBBC04] hover:bg-[#F2A500]'
                    : 'bg-[#1A73E8] hover:bg-[#1967D2]'
                } disabled:opacity-50 disabled:scale-100`}
              >
                {submitting ? 'Menyimpan...' : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> {editingId ? 'Simpan Perubahan' : 'Simpan Jurnal'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List Section */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow relative">
        <div className="p-5 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#34A853]" />
              <h2 className="text-[#202124] text-lg font-medium">Daftar Log Kegiatan</h2>
            </div>
            
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Cari kegiatan..." 
                  value={filter.keyword}
                  onChange={e => setFilter({...filter, keyword: e.target.value})}
                  className="pl-8 pr-3 py-1.5 text-xs bg-[#F8F9FA] border border-gray-200 rounded-full focus:ring-1 focus:ring-[#1A73E8] outline-none"
                />
                <List className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              
              <select 
                value={filter.status}
                onChange={e => setFilter({...filter, status: e.target.value})}
                className="px-3 py-1.5 text-xs bg-[#F8F9FA] border border-gray-200 rounded-full focus:ring-1 focus:ring-[#1A73E8] outline-none"
              >
                <option value="Semua">Semua Status</option>
                <option value="Selesai">Selesai</option>
                <option value="Proses">Proses</option>
                <option value="Pending">Pending</option>
              </select>

              <input 
                type="date" 
                value={filter.date}
                onChange={e => setFilter({...filter, date: e.target.value})}
                className="px-3 py-1.5 text-xs bg-[#F8F9FA] border border-gray-200 rounded-full focus:ring-1 focus:ring-[#1A73E8] outline-none"
              />

              {(filter.keyword || filter.status !== 'Semua' || filter.date) && (
                <button 
                  onClick={() => setFilter({ keyword: '', status: 'Semua', date: '' })}
                  className="text-[10px] font-bold text-[#EA4335] hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-0 overflow-x-auto">
          {filteredKegiatan.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-[#F8F9FA] rounded-full flex items-center justify-center mb-5 border border-gray-200">
                <List className="w-10 h-10 text-[#9AA0A6]" />
              </div>
              <p className="text-[#202124] font-medium text-xl">Belum ada jurnal kegiatan</p>
              <p className="text-[#5F6368] text-sm mt-2 max-w-sm">
                Rekam jejak magang Anda kosong. Mulai catat apa yang Anda pelajari dan kerjakan hari ini.
              </p>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-6 text-[#1A73E8] hover:text-[#1967D2] text-sm font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Tambah Jurnal Pertama
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8F9FA] text-[#5F6368] text-xs font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Deskripsi Kegiatan</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredKegiatan.map(k => (
                  <tr key={k.id} className="hover:bg-[#F8F9FA] transition-colors group">
                    <td className="px-6 py-5 text-[#5F6368] whitespace-nowrap font-medium flex items-center gap-2 align-top">
                      <Calendar className="w-4 h-4 text-[#9AA0A6] group-hover:text-[#1A73E8] transition-colors" />
                      {k.tanggal}
                    </td>
                    <td className="px-6 py-5 text-[#202124]">
                      <p className="whitespace-pre-wrap mb-4">{k.kegiatan}</p>
                      
                      {/* Comment Thread */}
                      <div className="mt-2 space-y-2 max-w-lg">
                        {comments.filter(c => c.kegiatan_id === k.id).map(comment => (
                          <div key={comment.id} className="flex gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[8px] font-bold text-white ${comment.profiles?.role === 'dosen' ? 'bg-[#137333]' : 'bg-[#1A73E8]'}`}>
                              {comment.profiles?.nama_lengkap?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1 bg-white border border-gray-100 rounded-lg px-2.5 py-1.5 shadow-sm">
                              <p className="text-[9px] font-bold text-[#202124] mb-0.5">{comment.profiles?.nama_lengkap} <span className="font-normal text-gray-400 text-[8px]">({comment.profiles?.role})</span></p>
                              <p className="text-[11px] text-[#5F6368] leading-normal">{comment.message}</p>
                            </div>
                          </div>
                        ))}

                        {/* Comment Input */}
                        <div className="flex gap-2 pt-1">
                          <input 
                            type="text" 
                            placeholder="Balas komentar..."
                            value={newComment[k.id] || ''}
                            onChange={e => setNewComment(prev => ({ ...prev, [k.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handlePostComment(k.id)}
                            className="flex-1 bg-[#F8F9FA] border border-gray-200 rounded-full px-3 py-1 text-[11px] outline-none focus:border-[#1A73E8] transition-colors"
                          />
                          <button 
                            onClick={() => handlePostComment(k.id)}
                            disabled={isCommenting[k.id] || !newComment[k.id]?.trim()}
                            className="text-[#1A73E8] hover:text-[#1967D2] text-[11px] font-bold disabled:opacity-50"
                          >
                            Kirim
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap align-top">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        k.status === 'Selesai' ? 'bg-[#E6F4EA] text-[#137333]' :
                        k.status === 'Proses' ? 'bg-[#FEF7E0] text-[#E37400]' :
                        'bg-[#F1F3F4] text-[#3C4043]'
                      }`}>
                        {k.status === 'Selesai' && <CheckCircle2 className="w-3 h-3" />}
                        {k.status === 'Proses' && <Activity className="w-3 h-3" />}
                        {k.status === 'Pending' && <AlertCircle className="w-3 h-3" />}
                        {k.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right align-top flex justify-end gap-1">
                      <button
                        onClick={() => handleEditClick(k)}
                        className="text-[#5F6368] hover:text-[#FBBC04] p-2 rounded-full hover:bg-[#FEF7E0] transition-colors"
                        title="Edit Kegiatan"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(k.id)}
                        className="text-[#5F6368] hover:text-[#EA4335] p-2 rounded-full hover:bg-[#FCE8E6] transition-colors"
                        title="Hapus Kegiatan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
