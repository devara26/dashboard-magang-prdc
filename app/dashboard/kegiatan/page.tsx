'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { List, Plus, Trash2, Calendar, Activity, CheckCircle2, FileText, ChevronRight, AlertCircle, X, Edit2 } from 'lucide-react'
import { toast } from 'sonner'

type Kegiatan = {
  id: number
  tanggal: string
  kegiatan: string
  status: string
  created_at: string
}

export default function KegiatanPage() {
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    kegiatan: '',
    status: 'Selesai',
  })

  useEffect(() => { fetchKegiatan() }, [])

  async function fetchKegiatan() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles').select('nim').eq('id', user.id).single()
    const nim = profile?.nim

    if (nim) {
      const { data } = await supabase
        .from('Kegiatan')
        .select('*')
        .eq('nim', nim)
        .order('tanggal', { ascending: false })
      setKegiatan(data || [])
    } else {
      setKegiatan([])
    }
    setLoading(false)
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')

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
        toast.success('Jurnal kegiatan berhasil diperbarui')
      } else {
        // Mode Tambah
        const { data: profile } = await supabase
          .from('profiles')
          .select('nama_lengkap, nim')
          .eq('id', user.id)
          .single()

        const { error } = await supabase.from('Kegiatan').insert({
          tanggal: form.tanggal,
          kegiatan: form.kegiatan,
          status: form.status,
          nama_mahasiswa: profile?.nama_lengkap || '',
          nim: profile?.nim || '',
        })
        if (error) throw error
        toast.success('Jurnal kegiatan berhasil disimpan')
      }

      resetForm()
      fetchKegiatan()
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan jurnal kegiatan')
      console.error(error)
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
      
      toast.success('Kegiatan berhasil dihapus')
      fetchKegiatan()
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus kegiatan')
      console.error(error)
    }
  }

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-cyan-500 rounded-full animate-spin"></div>
        <p className="text-zinc-500 text-sm font-medium animate-pulse">Memuat data kegiatan...</p>
      </div>
    </div>
  )

  return (
    <div className="pb-12 animate-[fade-in_0.7s_ease-out]">
      {/* Header Section */}
      <div className="mb-10 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 relative z-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
              <List className="w-8 h-8 text-purple-400" />
              Jurnal <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Kegiatan</span>
            </h1>
            <p className="text-zinc-400 text-base">
              Catat dan pantau seluruh aktivitas magang harian Anda
            </p>
          </div>
          <button
            onClick={() => showForm ? resetForm() : setShowForm(true)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg active:scale-95 border ${
              showForm 
                ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700 shadow-none' 
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-transparent shadow-purple-500/20 hover:shadow-purple-500/40'
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
          <form onSubmit={handleSubmit} className="bg-zinc-900/50 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6 md:p-8 relative z-10 hover:border-purple-500/50 transition-colors">
            <h2 className="text-white text-lg font-semibold mb-6 flex items-center gap-2">
              {editingId ? <Edit2 className="w-5 h-5 text-amber-400" /> : <FileText className="w-5 h-5 text-purple-400" />}
              {editingId ? 'Edit Jurnal Kegiatan' : 'Form Tambah Kegiatan'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tanggal Kegiatan</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                  </div>
                  <input
                    type="date"
                    value={form.tanggal}
                    onChange={e => setForm({ ...form, tanggal: e.target.value })}
                    required
                    className="w-full bg-zinc-950 text-white rounded-xl pl-11 pr-4 py-3 text-sm border border-zinc-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status Pengerjaan</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Activity className="w-4 h-4 text-zinc-500" />
                  </div>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-zinc-950 text-white rounded-xl pl-11 pr-4 py-3 text-sm border border-zinc-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors appearance-none"
                  >
                    <option value="Selesai">Selesai</option>
                    <option value="Proses">Proses</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Deskripsi / Detail Kegiatan</label>
              <textarea
                value={form.kegiatan}
                onChange={e => setForm({ ...form, kegiatan: e.target.value })}
                required
                rows={4}
                placeholder="Deskripsikan tugas atau pekerjaan yang Anda lakukan hari ini..."
                className="w-full bg-zinc-950 text-white rounded-xl px-4 py-3 text-sm border border-zinc-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none transition-colors"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800/50">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`text-white text-sm font-medium px-8 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 ${
                  editingId
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/20 hover:shadow-amber-500/40'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-purple-500/20 hover:shadow-purple-500/40'
                } disabled:opacity-50`}
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
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl overflow-hidden hover:border-zinc-700/50 transition-colors relative">
        <div className="p-6 border-b border-zinc-800/50 flex items-center gap-2">
          <Activity className="w-5 h-5 text-zinc-400" />
          <h2 className="text-white text-lg font-semibold">Daftar Log Kegiatan</h2>
        </div>
        
        <div className="p-0 overflow-x-auto">
          {kegiatan.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-zinc-800/30 rounded-full flex items-center justify-center mb-5 border border-zinc-700/50">
                <List className="w-10 h-10 text-zinc-500" />
              </div>
              <p className="text-zinc-300 font-semibold text-xl">Belum ada jurnal kegiatan</p>
              <p className="text-zinc-500 text-sm mt-2 max-w-sm">
                Rekam jejak magang Anda kosong. Mulai catat apa yang Anda pelajari dan kerjakan hari ini.
              </p>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-6 text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Tambah Jurnal Pertama
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Tanggal</th>
                  <th className="px-6 py-4 font-medium">Deskripsi Kegiatan</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {kegiatan.map(k => (
                  <tr key={k.id} className="hover:bg-zinc-800/20 transition-colors group">
                    <td className="px-6 py-5 text-zinc-400 whitespace-nowrap font-medium flex items-center gap-2 align-top">
                      <Calendar className="w-4 h-4 text-zinc-600 group-hover:text-purple-400/50 transition-colors" />
                      {k.tanggal}
                    </td>
                    <td className="px-6 py-5 text-zinc-200">
                      <p className="whitespace-pre-wrap">{k.kegiatan}</p>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap align-top">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                        k.status === 'Selesai' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        k.status === 'Proses' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                        'bg-zinc-800 text-zinc-400 border-zinc-700'
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
                        className="text-zinc-500 hover:text-amber-400 p-2 rounded-lg hover:bg-amber-400/10 transition-colors"
                        title="Edit Kegiatan"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(k.id)}
                        className="text-zinc-500 hover:text-rose-400 p-2 rounded-lg hover:bg-rose-400/10 transition-colors"
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