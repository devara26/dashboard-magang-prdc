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
  comment: string
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
        // Try uppercase 'Kegiatan' first
        let { data, error } = await supabase
          .from('Kegiatan')
          .select('*')
          .eq('nim', nim)
          .order('tanggal', { ascending: false })
        
        // Fallback to lowercase 'kegiatan' if uppercase fails
        if (error) {
          const { data: dataLow, error: errorLow } = await supabase
            .from('kegiatan')
            .select('*')
            .eq('nim', nim)
            .order('tanggal', { ascending: false })
          
          if (errorLow) throw errorLow
          data = dataLow
        }

        setKegiatan(data || [])

        if (data && data.length > 0) {
          const { data: commentsData } = await supabase
            .from('comments')
            .select('*, profiles(nama_lengkap, role)')
            .in('kegiatan_id', data.map(k => k.id))
            .order('created_at', { ascending: true })
          
          setComments(commentsData as any || [])
        }
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
        // Try uppercase 'Kegiatan'
        let { data, error } = await supabase.from('Kegiatan').update({
          tanggal: form.tanggal,
          kegiatan: form.kegiatan,
          status: form.status,
        }).eq('id', editingId).select()
        
        // Fallback to lowercase 'kegiatan'
        if (error) {
          const { data: dataLow, error: errorLow } = await supabase.from('kegiatan').update({
            tanggal: form.tanggal,
            kegiatan: form.kegiatan,
            status: form.status,
          }).eq('id', editingId).select()
          
          if (errorLow) throw errorLow
          data = dataLow
        }

        if (!data || data.length === 0) {
          throw new Error('Gagal memperbarui data. Pastikan Anda memiliki akses.')
        }
        await logAction('Update Jurnal', `Update jurnal untuk tanggal ${form.tanggal}`, String(editingId))
        toast.success('Jurnal kegiatan berhasil diperbarui')
      } else {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('nama_lengkap, nim')
          .eq('id', user.id)
          .single()
        
        if (profileError) throw new Error('Gagal memverifikasi data mahasiswa.')
        const nim = profile?.nim || ''

        if (form.kegiatan.length < 50) {
          throw new Error('Deskripsi kegiatan terlalu singkat. Minimal 50 karakter.')
        }

        // Try uppercase 'Kegiatan'
        let { error } = await supabase.from('Kegiatan').insert({
          tanggal: form.tanggal,
          kegiatan: form.kegiatan,
          status: form.status,
          nama_mahasiswa: profile?.nama_lengkap || '',
          nim: nim,
        })

        // Fallback to lowercase 'kegiatan'
        if (error) {
          const { error: errorLow } = await supabase.from('kegiatan').insert({
            tanggal: form.tanggal,
            kegiatan: form.kegiatan,
            status: form.status,
            nama_mahasiswa: profile?.nama_lengkap || '',
            nim: nim,
          })
          if (errorLow) throw errorLow
        }

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
        throw new Error('Akses ditolak: Tidak dapat menghapus karena pengaturan RLS di tabel Kegiatan memblokir aksi DELETE.')
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
    const komentarTeks = newComment[kegiatanId]?.trim()
    if (!komentarTeks) return

    setIsCommenting(prev => ({ ...prev, [kegiatanId]: true }))
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi tidak ditemukan')

      const { error } = await supabase
        .from('comments')
        .insert({
          kegiatan_id: kegiatanId,
          user_id: user.id,
          comment: komentarTeks
        })

      if (error) throw error

      setNewComment(prev => ({ ...prev, [kegiatanId]: '' }))
      toast.success('Komentar berhasil dikirim')
      fetchKegiatan()
    } catch (error: any) {
      console.error(error)
      toast.error('Gagal mengirim komentar: ' + error.message)
    } finally {
      setIsCommenting(prev => ({ ...prev, [kegiatanId]: false }))
    }
  }

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1A73E8] rounded-full animate-spin"></div>
        <p className="text-[#5F6368] text-sm font-medium animate-pulse">Memuat data kegiatan...</p>
      </div>
    </div>
  )

  return (
    <div className="pb-20 max-w-5xl mx-auto px-4 animate-[fade-in_0.5s_ease-out]">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 mt-4">
        <div>
          <h1 className="text-3xl font-black text-[#202124] tracking-tight">Jurnal Kegiatan</h1>
          <p className="text-[#5F6368] font-medium mt-1">Catat dan pantau progres magang harianmu di sini.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#1A73E8] text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-[#1765cc] active:scale-95 transition-all w-full md:w-auto"
        >
          <Plus className="w-5 h-5" />
          Tambah Kegiatan
        </button>
      </div>

      {/* Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-2 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-[#9AA0A6]" />
          <input
            type="date"
            value={filter.date}
            onChange={(e) => setFilter({ ...filter, date: e.target.value })}
            className="bg-transparent border-none outline-none text-sm font-semibold text-[#202124] w-full"
          />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-2 flex items-center gap-3 md:col-span-2">
          <List className="w-5 h-5 text-[#9AA0A6]" />
          <input
            type="text"
            placeholder="Cari kegiatan..."
            value={filter.keyword}
            onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
            className="bg-transparent border-none outline-none text-sm font-semibold text-[#202124] w-full"
          />
        </div>
      </div>

      {/* List Section */}
      <div className="space-y-6">
        {kegiatan
          .filter(k => 
            (!filter.date || k.tanggal === filter.date) &&
            (!filter.keyword || k.kegiatan.toLowerCase().includes(filter.keyword.toLowerCase()))
          )
          .length === 0 ? (
          <div className="bg-white rounded-[32px] border border-dashed border-gray-200 p-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-[#202124] mb-2">Belum ada catatan</h3>
            <p className="text-[#5F6368] max-w-xs mx-auto">Mulai isi jurnal kegiatan harianmu agar progres magang tetap terpantau.</p>
          </div>
        ) : (
          kegiatan
            .filter(k => 
              (!filter.date || k.tanggal === filter.date) &&
              (!filter.keyword || k.kegiatan.toLowerCase().includes(filter.keyword.toLowerCase()))
            )
            .map((k) => (
            <div key={k.id} className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden group hover:border-[#1A73E8] transition-all duration-300">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex flex-col items-center justify-center border border-gray-100 group-hover:bg-[#E8F0FE] group-hover:border-[#1A73E8] transition-colors">
                      <span className="text-[10px] font-bold text-[#5F6368] uppercase group-hover:text-[#1A73E8]">{new Date(k.tanggal).toLocaleDateString('id-ID', { month: 'short' })}</span>
                      <span className="text-xl font-black text-[#202124] leading-none group-hover:text-[#1A73E8]">{new Date(k.tanggal).getDate()}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-[#202124]">{new Date(k.tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric' })}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider mt-1 ${
                        k.status === 'Selesai' ? 'bg-[#E6F4EA] text-[#137333]' : 'bg-[#FEF7E0] text-[#E37400]'
                      }`}>
                        {k.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditClick(k)} className="p-2.5 bg-gray-50 text-[#5F6368] hover:text-[#1A73E8] hover:bg-[#E8F0FE] rounded-xl transition-all" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(Number(k.id))} className="p-2.5 bg-gray-50 text-[#5F6368] hover:text-[#EA4335] hover:bg-red-50 rounded-xl transition-all" title="Hapus">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="bg-gray-50/50 rounded-2xl p-6 mb-8 border border-gray-50">
                  <p className="text-[#202124] text-sm leading-relaxed whitespace-pre-wrap">{k.kegiatan}</p>
                </div>

                {/* Comments Section */}
                <div className="border-t border-gray-100 pt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-[#1A73E8]" />
                    <h4 className="text-xs font-black text-[#202124] uppercase tracking-wider">Diskusi & Feedback</h4>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                    {comments
                      .filter(c => String(c.kegiatan_id) === String(k.id))
                      .map(comment => (
                        <div key={comment.id} className="flex gap-3 group/comment">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${comment.profiles?.role === 'dosen' ? 'bg-[#1A73E8] text-white' : 'bg-gray-100 text-[#5F6368]'}`}>
                            {comment.profiles?.nama_lengkap?.charAt(0) || '?'}
                          </div>
                          <div className={`rounded-2xl px-4 py-3 max-w-lg ${comment.profiles?.role === 'dosen' ? 'bg-blue-50/50 border border-blue-100' : 'bg-gray-50 border border-gray-100'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-[#202124] text-xs">
                                {comment.profiles?.nama_lengkap || 'Anonim'}
                              </span>
                              {comment.profiles?.role === 'dosen' && <span className="px-1.5 py-0.5 bg-[#1A73E8] text-white rounded text-[8px] font-black uppercase">Pembimbing</span>}
                            </div>
                            <p className="text-[#5F6368] text-xs leading-relaxed">{comment.comment}</p>
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Tulis balasan atau pertanyaan..."
                        value={newComment[Number(k.id)] || ''}
                        onChange={e => setNewComment(prev => ({ ...prev, [Number(k.id)]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handlePostComment(Number(k.id))}
                        className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3 text-xs font-semibold outline-none focus:border-[#1A73E8] focus:ring-4 focus:ring-blue-50 transition-all pr-12"
                      />
                      <button
                        onClick={() => handlePostComment(Number(k.id))}
                        disabled={isCommenting[Number(k.id)] || !newComment[Number(k.id)]?.trim()}
                        className="absolute right-2 top-1.5 p-1.5 text-[#1A73E8] hover:bg-blue-50 rounded-xl disabled:opacity-30 transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-[fade-in_0.2s_ease-out]">
          <div className="absolute inset-0 bg-[#202124]/60 backdrop-blur-sm" onClick={() => !submitting && resetForm()} />
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden animate-[fade-in_0.3s_ease-out]">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-2xl font-black text-[#202124] tracking-tight">{editingId ? 'Edit Jurnal' : 'Jurnal Baru'}</h2>
                <p className="text-[#5F6368] text-xs font-medium mt-1">Lengkapi detail kegiatan harianmu.</p>
              </div>
              <button onClick={resetForm} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-6 h-6 text-[#5F6368]" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#9AA0A6] uppercase tracking-widest ml-1">Tanggal</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA0A6]" />
                    <input
                      type="date"
                      required
                      value={form.tanggal}
                      onChange={e => setForm({ ...form, tanggal: e.target.value })}
                      className="w-full bg-[#F8F9FA] border border-gray-100 rounded-2xl px-12 py-4 text-sm font-bold outline-none focus:border-[#1A73E8] transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#9AA0A6] uppercase tracking-widest ml-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-[#F8F9FA] border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-[#1A73E8] transition-all appearance-none"
                  >
                    <option value="Selesai">Selesai</option>
                    <option value="Progres">Progres</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#9AA0A6] uppercase tracking-widest ml-1">Deskripsi Kegiatan</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Ceritakan apa yang kamu kerjakan hari ini... (Min. 50 karakter)"
                  value={form.kegiatan}
                  onChange={e => setForm({ ...form, kegiatan: e.target.value })}
                  className="w-full bg-[#F8F9FA] border border-gray-100 rounded-[28px] px-6 py-5 text-sm font-medium outline-none focus:border-[#1A73E8] transition-all resize-none leading-relaxed"
                />
                <div className="flex justify-between px-1">
                  <p className={`text-[10px] font-bold ${form.kegiatan.length < 50 ? 'text-[#EA4335]' : 'text-[#34A853]'}`}>
                    {form.kegiatan.length}/50 karakter minimal
                  </p>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-4 border border-gray-200 rounded-2xl font-bold text-sm text-[#5F6368] hover:bg-gray-50 active:scale-95 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || form.kegiatan.length < 50}
                  className="flex-[2] py-4 bg-[#1A73E8] text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-[#1765cc] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      {editingId ? 'Simpan Perubahan' : 'Posting Jurnal'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
