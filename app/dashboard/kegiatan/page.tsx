'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
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
        let { data, error } = await supabase.from('Kegiatan').select('*').eq('nim', nim).order('tanggal', { ascending: false })
        if (error) {
          const { data: dataLow, error: errorLow } = await supabase.from('kegiatan').select('*').eq('nim', nim).order('tanggal', { ascending: false })
          if (!errorLow) data = dataLow
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
    setForm({ tanggal: k.tanggal, kegiatan: k.kegiatan, status: k.status })
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
        let { data, error } = await supabase.from('Kegiatan').update({
          tanggal: form.tanggal,
          kegiatan: form.kegiatan,
          status: form.status,
        }).eq('id', editingId).select()
        
        if (error) {
          const { data: dataLow, error: errorLow } = await supabase.from('kegiatan').update({
            tanggal: form.tanggal,
            kegiatan: form.kegiatan,
            status: form.status,
          }).eq('id', editingId).select()
          if (!errorLow) data = dataLow
        }

        if (!data || data.length === 0) throw new Error('Gagal memperbarui data.')
        await logAction('Update Jurnal', `Update jurnal untuk tanggal ${form.tanggal}`, String(editingId))
        toast.success('Jurnal kegiatan berhasil diperbarui')
      } else {
        const { data: profile } = await supabase.from('profiles').select('nama_lengkap, nim').eq('id', user.id).single()
        if (form.kegiatan.length < 50) throw new Error('Minimal 50 karakter.')

        let { error } = await supabase.from('Kegiatan').insert({
          tanggal: form.tanggal,
          kegiatan: form.kegiatan,
          status: form.status,
          nama_mahasiswa: profile?.nama_lengkap || '',
          nim: profile?.nim || '',
        })

        if (error) {
          const { error: errorLow } = await supabase.from('kegiatan').insert({
            tanggal: form.tanggal,
            kegiatan: form.kegiatan,
            status: form.status,
            nama_mahasiswa: profile?.nama_lengkap || '',
            nim: profile?.nim || '',
          })
          if (errorLow) throw errorLow
        }

        await logAction('Tambah Jurnal', `Tambah jurnal baru untuk tanggal ${form.tanggal}`)
        toast.success('Jurnal kegiatan berhasil disimpan')
      }
      resetForm()
      fetchKegiatan()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Hapus log kegiatan ini?')) return
    try {
      const { data, error } = await supabase.from('Kegiatan').delete().eq('id', id).select()
      if (error || !data || data.length === 0) throw new Error('Gagal menghapus.')
      await logAction('Hapus Jurnal', `Hapus jurnal ID: ${id}`)
      toast.success('Kegiatan berhasil dihapus')
      fetchKegiatan()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  async function handlePostComment(kegiatanId: number) {
    const komentarTeks = newComment[kegiatanId]?.trim()
    if (!komentarTeks) return
    setIsCommenting(prev => ({ ...prev, [kegiatanId]: true }))
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('comments').insert({ kegiatan_id: kegiatanId, user_id: user?.id, comment: komentarTeks })
      if (error) throw error
      setNewComment(prev => ({ ...prev, [kegiatanId]: '' }))
      toast.success('Komentar berhasil dikirim')
      fetchKegiatan()
    } catch (error: any) {
      toast.error('Gagal mengirim komentar: ' + error.message)
    } finally {
      setIsCommenting(prev => ({ ...prev, [kegiatanId]: false }))
    }
  }

  if (loading) return null

  return (
    <div className="animate-fade-in space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-[32px] leading-[40px] font-bold tracking-tight text-[var(--on-surface)]">Jurnal Kegiatan</h1>
          <p className="text-[14px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest mt-1">Laporan Aktivitas Harian</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-[var(--primary)] text-white rounded-[24px] font-black text-sm shadow-xl shadow-blue-100 hover:scale-[1.02] transition-all active:scale-95"
        >
          <span className="material-symbols-outlined">add</span>
          Tambah Kegiatan
        </button>
      </div>

      {/* Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4 bg-[var(--surface-container-lowest)] rounded-2xl border border-[var(--outline-variant)] px-5 py-3 flex items-center gap-4 group focus-within:border-[var(--primary)] transition-all">
          <span className="material-symbols-outlined text-[var(--outline)] group-focus-within:text-[var(--primary)]">calendar_today</span>
          <input
            type="date"
            value={filter.date}
            onChange={(e) => setFilter({ ...filter, date: e.target.value })}
            className="bg-transparent border-none outline-none text-[14px] font-bold text-[var(--on-surface)] w-full"
          />
        </div>
        <div className="md:col-span-8 bg-[var(--surface-container-lowest)] rounded-2xl border border-[var(--outline-variant)] px-5 py-3 flex items-center gap-4 group focus-within:border-[var(--primary)] transition-all">
          <span className="material-symbols-outlined text-[var(--outline)] group-focus-within:text-[var(--primary)]">search</span>
          <input
            type="text"
            placeholder="Cari deskripsi kegiatan..."
            value={filter.keyword}
            onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
            className="bg-transparent border-none outline-none text-[14px] font-bold text-[var(--on-surface)] w-full placeholder:text-[var(--outline)]"
          />
        </div>
      </div>

      {/* List Section */}
      <div className="space-y-8">
        {kegiatan
          .filter(k => (!filter.date || k.tanggal === filter.date) && (!filter.keyword || k.kegiatan.toLowerCase().includes(filter.keyword.toLowerCase())))
          .length === 0 ? (
          <div className="bg-[var(--surface-container-lowest)] rounded-[40px] border border-dashed border-[var(--outline-variant)] p-24 text-center">
            <div className="w-24 h-24 bg-[var(--surface-container-low)] rounded-full flex items-center justify-center mx-auto mb-8">
              <span className="material-symbols-outlined text-[56px] text-[var(--outline-variant)]">description</span>
            </div>
            <h3 className="text-[20px] font-black text-[var(--on-surface)] mb-2">Belum ada catatan</h3>
            <p className="text-[14px] font-medium text-[var(--on-surface-variant)] max-w-sm mx-auto">Mulai isi jurnal kegiatan harianmu agar progres magang tetap terpantau oleh pembimbing.</p>
          </div>
        ) : (
          kegiatan
            .filter(k => (!filter.date || k.tanggal === filter.date) && (!filter.keyword || k.kegiatan.toLowerCase().includes(filter.keyword.toLowerCase())))
            .map((k) => (
            <div key={k.id} className="bg-[var(--surface-container-lowest)] rounded-[40px] border border-[var(--outline-variant)] shadow-sm overflow-hidden group hover:border-[var(--primary)] transition-all duration-500">
              <div className="p-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-[var(--surface-container-low)] rounded-2xl flex flex-col items-center justify-center border border-[var(--outline-variant)]/30 group-hover:bg-[var(--primary-container)] group-hover:border-[var(--primary)] transition-all">
                      <span className="text-[10px] font-black text-[var(--on-surface-variant)] uppercase group-hover:text-[var(--on-primary-container)]">{new Date(k.tanggal).toLocaleDateString('id-ID', { month: 'short' })}</span>
                      <span className="text-[24px] font-black text-[var(--on-surface)] leading-none group-hover:text-[var(--on-primary-container)]">{new Date(k.tanggal).getDate()}</span>
                    </div>
                    <div>
                      <h3 className="text-[18px] font-black text-[var(--on-surface)]">{new Date(k.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
                      <div className="flex items-center gap-3 mt-2">
                         <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                           k.status === 'Selesai' ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fef7e0] text-[#e37400]'
                         }`}>
                           {k.status}
                         </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleEditClick(k)} className="w-11 h-11 flex items-center justify-center bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] hover:text-[var(--primary)] hover:bg-[var(--primary-container)] border border-[var(--outline-variant)]/50 rounded-2xl transition-all" title="Edit">
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button onClick={() => handleDelete(Number(k.id))} className="w-11 h-11 flex items-center justify-center bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] hover:text-[var(--error)] hover:bg-[var(--error-container)] border border-[var(--outline-variant)]/50 rounded-2xl transition-all" title="Hapus">
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
                
                <div className="bg-[var(--surface-container-low)]/50 rounded-[32px] p-8 mb-10 border border-[var(--outline-variant)]/20">
                  <p className="text-[var(--on-surface)] text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{k.kegiatan}</p>
                </div>

                {/* Comments Section */}
                <div className="border-t border-[var(--outline-variant)]/30 pt-10">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="material-symbols-outlined text-[var(--primary)]">forum</span>
                    <h4 className="text-[12px] font-black text-[var(--on-surface)] uppercase tracking-widest">Diskusi & Feedback</h4>
                  </div>
                  
                  <div className="space-y-6 mb-8">
                    {comments
                      .filter(c => String(c.kegiatan_id) === String(k.id))
                      .map(comment => (
                        <div key={comment.id} className="flex gap-4 group/comment">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-black shrink-0 shadow-sm ${comment.profiles?.role === 'dosen' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]'}`}>
                            {comment.profiles?.nama_lengkap?.charAt(0) || '?'}
                          </div>
                          <div className={`rounded-[24px] px-6 py-4 max-w-xl ${comment.profiles?.role === 'dosen' ? 'bg-[var(--primary-container)] border border-[var(--primary)]/10' : 'bg-[var(--surface-container-low)] border border-[var(--outline-variant)]/20'}`}>
                            <div className="flex items-center gap-3 mb-1.5">
                              <span className="font-black text-[var(--on-surface)] text-[13px]">
                                {comment.profiles?.nama_lengkap || 'Anonim'}
                              </span>
                              {comment.profiles?.role === 'dosen' && <span className="px-2 py-0.5 bg-[var(--primary)] text-white rounded-lg text-[9px] font-black uppercase tracking-wider">Pembimbing</span>}
                            </div>
                            <p className="text-[var(--on-surface-variant)] text-[13px] font-medium leading-relaxed">{comment.comment}</p>
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Tulis balasan atau pertanyaan untuk pembimbing..."
                        value={newComment[Number(k.id)] || ''}
                        onChange={e => setNewComment(prev => ({ ...prev, [Number(k.id)]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handlePostComment(Number(k.id))}
                        className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-[24px] px-6 py-4 text-[13px] font-bold outline-none focus:border-[var(--primary)] focus:bg-white transition-all pr-14"
                      />
                      <button
                        onClick={() => handlePostComment(Number(k.id))}
                        disabled={isCommenting[Number(k.id)] || !newComment[Number(k.id)]?.trim()}
                        className="absolute right-2 top-2 w-10 h-10 flex items-center justify-center text-[var(--primary)] hover:bg-[var(--primary-container)] rounded-full disabled:opacity-30 transition-all"
                      >
                        <span className="material-symbols-outlined">send</span>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--on-surface)]/40 backdrop-blur-md" onClick={() => !submitting && resetForm()} />
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl relative z-10 overflow-hidden animate-[fade-in_0.3s_ease-out]">
            <div className="p-10 border-b border-[var(--outline-variant)]/30 flex justify-between items-center bg-[var(--surface-container-lowest)]">
              <div>
                <h2 className="text-[28px] font-black text-[var(--on-surface)] tracking-tight">{editingId ? 'Edit Jurnal' : 'Jurnal Baru'}</h2>
                <p className="text-[12px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest mt-1">Lengkapi detail kegiatan harian</p>
              </div>
              <button onClick={resetForm} className="w-12 h-12 flex items-center justify-center hover:bg-[var(--surface-container-low)] rounded-full transition-colors">
                <span className="material-symbols-outlined text-[32px] text-[var(--on-surface-variant)]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest ml-1">Tanggal</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--outline)]">calendar_today</span>
                    <input
                      type="date"
                      required
                      value={form.tanggal}
                      onChange={e => setForm({ ...form, tanggal: e.target.value })}
                      className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)]/50 rounded-2xl px-14 py-4 text-[14px] font-bold outline-none focus:border-[var(--primary)] focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest ml-1">Status Pekerjaan</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)]/50 rounded-2xl px-6 py-4 text-[14px] font-bold outline-none focus:border-[var(--primary)] focus:bg-white transition-all appearance-none"
                  >
                    <option value="Selesai">Selesai</option>
                    <option value="Progres">Dalam Progres</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end ml-1">
                   <label className="text-[11px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest">Deskripsi Kegiatan</label>
                   <span className={`text-[10px] font-black tracking-widest ${form.kegiatan.length < 50 ? 'text-[var(--error)]' : 'text-[#137333]'}`}>
                     {form.kegiatan.length}/50 MINIMAL
                   </span>
                </div>
                <textarea
                  required
                  rows={6}
                  placeholder="Ceritakan apa yang kamu kerjakan hari ini dengan detail..."
                  value={form.kegiatan}
                  onChange={e => setForm({ ...form, kegiatan: e.target.value })}
                  className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)]/50 rounded-[32px] px-8 py-6 text-[15px] font-medium outline-none focus:border-[var(--primary)] focus:bg-white transition-all resize-none leading-relaxed"
                />
              </div>

              <div className="pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-5 border border-[var(--outline-variant)] rounded-2xl font-black text-sm text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)] transition-all"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={submitting || form.kegiatan.length < 50}
                  className="flex-[2] py-5 bg-[var(--primary)] text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-3"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                      {editingId ? 'SIMPAN PERUBAHAN' : 'POSTING JURNAL'}
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
