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
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({})
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
      // Panggil fungsi refresh data kegiatan di sini jika ada, contoh: fetchKegiatan()
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
    <div className="pb-12 max-w-5xl mx-auto px-4">
      <h1 className="text-2xl font-bold text-[#202124] mb-6">Daftar Kegiatan Magang</h1>

      {/* Tampilan List Kegiatan */}
      <div className="space-y-4">
        {kegiatan.map((k) => (
          <div key={k.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-[#5F6368] font-medium">{k.tanggal}</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                k.status === 'Selesai' ? 'bg-[#E6F4EA] text-[#137333]' : 'bg-[#FEF7E0] text-[#B06000]'
              }`}>
                {k.status}
              </span>
            </div>
            <p className="text-sm text-[#202124] mb-4 whitespace-pre-wrap">{k.kegiatan}</p>

            {/* Tombol Aksi Edit */}
            <div className="flex gap-2 border-t border-gray-100 pt-3 mb-4">
              <button
                onClick={() => {
                  setEditingId(k.id)
                  setShowForm(true)
                }}
                className="text-xs text-[#1A73E8] hover:underline font-medium"
              >
                Edit Kegiatan
              </button>
            </div>

            {/* Bagian Kolom Komentar */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-xs font-bold text-[#202124] mb-3">Komentar</h4>
              
              {/* Daftar Thread Komentar */}
              <div className="mt-2 space-y-2 max-w-lg mb-4">
                {comments
                  .filter(c => String(c.kegiatan_id) === String(k.id))
                  .map(comment => (
                    <div key={comment.id} className="flex gap-2 text-xs">
                      <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold">
                        {comment.profiles?.nama_lengkap?.charAt(0) || '?'}
                      </div>
                      <div className="bg-[#F1F3F4] rounded-xl px-3 py-1.5 flex-1">
                        <span className="font-bold text-[#202124] block mb-0.5">
                          {comment.profiles?.nama_lengkap || 'Anonim'}
                        </span>
                        <p className="text-[#5F6368]">{comment.comment}</p>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Form Input Balas Komentar */}
              <div className="flex items-center gap-2 max-w-lg">
                <input
                  type="text"
                  placeholder="Balas komentar..."
                  value={newComment[Number(k.id)] || ''}
                  onChange={e => setNewComment(prev => ({ ...prev, [Number(k.id)]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handlePostComment(Number(k.id))}
                  className="flex-1 bg-[#F8F9FA] border border-gray-200 rounded-full px-3 py-1.5 text-xs outline-none focus:border-[#1A73E8] transition-colors"
                />
                <button
                  onClick={() => handlePostComment(Number(k.id))}
                  disabled={isCommenting[Number(k.id)] || !newComment[Number(k.id)]?.trim()}
                  className="text-[#1A73E8] hover:text-[#1967D2] text-xs font-bold disabled:opacity-50 transition-colors"
                >
                  Kirim
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}
      </div>
    </div>
  )
}
