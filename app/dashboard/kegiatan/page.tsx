'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { logAction } from '@/lib/audit'
import { 
  Plus, 
  Search, 
  Calendar, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  XCircle,
  MoreVertical,
  X,
  Check,
  AlertCircle,
  FileText
} from 'lucide-react'

export default function JurnalPage() {
   const [kegiatan, setKegiatan] = useState<any[]>([])
   const [profile, setProfile] = useState<any>(null)
   const [loading, setLoading] = useState(true)
   const [showModal, setShowModal] = useState(false)
   const [submitting, setSubmitting] = useState(false)
   const [searchQuery, setSearchQuery] = useState('')
   const [editingId, setEditingId] = useState<number | null>(null)
   const [newKegiatan, setNewKegiatan] = useState({
      kegiatan: '',
      tanggal: new Date().toISOString().split('T')[0],
      status: 'Proses'
   })

   // Helper fungsi untuk logging yang aman terhadap kegagalan import/modul
   const safeLogAction = async (action: string, desc: string) => {
      try {
         if (typeof logAction === 'function') {
            await logAction(action, desc);
         }
      } catch (e) {
         console.log(`[Audit Fallback] ${action}: ${desc}`);
      }
   };

   useEffect(() => {
      fetchData()
   }, [])

   async function fetchData() {
      try {
         const { data: { user } } = await supabase.auth.getUser()
         if (!user) return

         const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
         setProfile(profileData)

         if (profileData?.nim) {
            const { data, error } = await supabase
               .from('Kegiatan')
               .select('*')
               .eq('nim', profileData.nim)
               .order('tanggal', { ascending: false })
            setKegiatan(data || [])
         }
      } catch (error) {
         console.error('Fetch error:', error)
      } finally {
         setLoading(false)
      }
   }

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault()

      if (!profile || !profile.nim) {
         toast.error('Data profil atau NIM Anda belum dimuat sempurna. Silakan muat ulang halaman.');
         return;
      }

      setSubmitting(true)
      try {
         const userNim = profile?.nim ?? '';
         const payload = {
            kegiatan: newKegiatan.kegiatan,
            tanggal: newKegiatan.tanggal,
            status: newKegiatan.status,
            nim: userNim
         }

         if (editingId) {
            const { error } = await supabase
               .from('Kegiatan')
               .update(payload)
               .eq('id', editingId)
            if (error) throw error
            await safeLogAction('Edit Jurnal', `Mengubah kegiatan: ${newKegiatan.kegiatan.substring(0, 30)}...`)
            toast.success('Jurnal berhasil diperbarui')
         } else {
            const { error } = await supabase
               .from('Kegiatan')
               .insert([payload])
            if (error) throw error
            await safeLogAction('Tambah Jurnal', `Menambahkan kegiatan: ${newKegiatan.kegiatan.substring(0, 30)}...`)
            toast.success('Jurnal berhasil ditambahkan')
         }

         setShowModal(false)
         resetForm()
         fetchData()
      } catch (error: any) {
         toast.error('Gagal: ' + error.message)
      } finally {
         setSubmitting(false)
      }
   }

   async function handleDelete(id: number) {
      if (!confirm('Apakah Anda yakin ingin menghapus jurnal ini?')) return
      try {
         const { error } = await supabase.from('Kegiatan').delete().eq('id', id)
         if (error) throw error
         toast.success('Jurnal berhasil dihapus')
         fetchData()
      } catch (error: any) {
         toast.error('Gagal menghapus: ' + error.message)
      }
   }

   function resetForm() {
      setNewKegiatan({
         kegiatan: '',
         tanggal: new Date().toISOString().split('T')[0],
         status: 'Proses'
      })
      setEditingId(null)
   }

   function openEdit(item: any) {
      setNewKegiatan({
         kegiatan: item.kegiatan,
         tanggal: item.tanggal,
         status: item.status
      })
      setEditingId(item.id)
      setShowModal(true)
   }

   // Loading Guard untuk data array
   const filteredKegiatan = !loading ? kegiatan.filter(k => 
      k.kegiatan.toLowerCase().includes(searchQuery.toLowerCase())
   ) : []

   if (loading) {
      return (
         <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-4 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin"></div>
         </div>
      )
   }

   return (
      <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
         {/* Header Area */}
         <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
               <h1 className="h1-orbit text-[var(--text-main)]">Jurnal Kegiatan</h1>
               <p className="subtitle-orbit text-[var(--text-muted)] mt-1">Catat dan pantau progres aktivitas magang harian Anda.</p>
            </div>
            <button
               onClick={() => { resetForm(); setShowModal(true); }}
               className="neumorphic-button flex items-center gap-2 accent-gradient text-white border-none"
            >
               <Plus size={20} />
               <span className="label-orbit font-bold">Tambah Jurnal</span>
            </button>
         </div>

         {/* Stats & Search */}
         <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="w-full lg:w-80 space-y-6">
               <div className="neumorphic-card p-8">
                  <h4 className="label-orbit font-bold text-[var(--text-main)] mb-6">Pencarian</h4>
                  <div className="relative">
                     <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-light)]" />
                     <input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari kegiatan..." 
                        className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-gray-100 text-[14px] font-medium outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/20 transition-all shadow-sm" 
                     />
                  </div>
               </div>

               <div className="neumorphic-card p-8">
                  <h4 className="label-orbit font-bold text-[var(--text-main)] mb-6">Status Ringkasan</h4>
                  <div className="space-y-4">
                     <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                        <div className="flex items-center gap-3">
                           <Clock size={16} className="text-blue-600" />
                           <span className="caption-orbit font-bold text-blue-700">MENUNGGU</span>
                        </div>
                        <span className="body2-orbit font-bold text-blue-800">{kegiatan.filter(k => !k.status_persetujuan || k.status_persetujuan === 'Menunggu').length}</span>
                     </div>
                     <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                        <div className="flex items-center gap-3">
                           <CheckCircle2 size={16} className="text-emerald-600" />
                           <span className="caption-orbit font-bold text-emerald-700">DISETUJUI</span>
                        </div>
                        <span className="body2-orbit font-bold text-emerald-800">{kegiatan.filter(k => k.status_persetujuan === 'Disetujui').length}</span>
                     </div>
                     <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                        <div className="flex items-center gap-3">
                           <XCircle size={16} className="text-red-600" />
                           <span className="caption-orbit font-bold text-red-700">DITOLAK</span>
                        </div>
                        <span className="body2-orbit font-bold text-red-800">{kegiatan.filter(k => k.status_persetujuan === 'Ditolak').length}</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Jurnal List */}
            <div className="flex-1 space-y-6 w-full">
               {filteredKegiatan.length > 0 ? filteredKegiatan.map((item) => (
                  <div key={item.id} className="neumorphic-card p-8 group hover:scale-[1.01] transition-all duration-300">
                     <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex gap-6">
                           <div className="hidden md:flex flex-col items-center justify-center w-20 h-20 rounded-3xl bg-gray-50 shrink-0 border border-gray-100 shadow-inner">
                              <span className="h3-orbit text-[var(--text-main)] leading-none">{new Date(item.tanggal).getDate()}</span>
                              <span className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest mt-1">{new Date(item.tanggal).toLocaleDateString('id-ID', { month: 'short' })}</span>
                           </div>
                           <div className="space-y-4">
                              <div className="flex flex-wrap items-center gap-3">
                                 <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                                    item.status_persetujuan === 'Disetujui' 
                                       ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                       : item.status_persetujuan === 'Ditolak' 
                                          ? 'bg-red-50 text-red-600 border-red-100' 
                                          : 'bg-orange-50 text-orange-600 border-orange-100'
                                 }`}>
                                    {item.status_persetujuan || 'Menunggu'}
                                 </span>
                                 <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${item.status === 'Selesai' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-50 text-gray-600 border border-gray-100'}`}>
                                    {item.status}
                                 </span>
                                 <span className="caption-orbit font-bold text-[var(--text-light)] flex items-center gap-2 md:hidden">
                                    <Calendar size={14} />
                                    {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                 </span>
                              </div>
                              <h3 className="body1-orbit font-bold text-[var(--text-main)] leading-relaxed">{item.kegiatan}</h3>
                           </div>
                        </div>
                        
                        <div className="flex md:flex-col items-center justify-between md:justify-start gap-4">
                           {item.status_persetujuan !== 'Disetujui' && (
                              <div className="flex md:flex-col gap-3">
                                 <button 
                                    onClick={() => openEdit(item)}
                                    className="w-10 h-10 flex items-center justify-center bg-gray-50 text-[var(--text-muted)] hover:bg-blue-50 hover:text-[var(--accent-blue)] rounded-xl transition-all shadow-sm border border-gray-100"
                                    title="Edit Jurnal"
                                 >
                                    <Edit2 size={18} />
                                 </button>
                                 <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="w-10 h-10 flex items-center justify-center bg-gray-50 text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 rounded-xl transition-all shadow-sm border border-gray-100"
                                    title="Hapus Jurnal"
                                 >
                                    <Trash2 size={18} />
                                 </button>
                              </div>
                           )}
                           {item.status_persetujuan === 'Disetujui' && (
                              <div className="w-10 h-10 flex items-center justify-center text-emerald-500 bg-emerald-50 rounded-full border border-emerald-100" title="Sudah Disetujui">
                                 <Check size={20} />
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               )) : (
                  <div className="neumorphic-card py-24 text-center space-y-8">
                     <div className="w-24 h-24 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto text-[var(--text-light)] shadow-inner border border-gray-100">
                        <FileText size={48} />
                     </div>
                     <div>
                        <h4 className="h4-orbit text-[var(--text-main)]">Belum ada catatan jurnal</h4>
                        <p className="body2-orbit text-[var(--text-muted)] mt-2">Mulai catat perkembangan magang Anda setiap harinya.</p>
                     </div>
                     <button onClick={() => { resetForm(); setShowModal(true); }} className="neumorphic-button accent-gradient text-white border-none px-10">Tulis Jurnal Pertama</button>
                  </div>
               )}
            </div>
         </div>

         {/* Write/Edit Entry Modal */}
         {showModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
               <div className="neumorphic-card w-full max-w-2xl p-10 relative z-10 animate-in zoom-in-95 duration-300 shadow-2xl">
                  <form onSubmit={handleSubmit} className="space-y-10">
                     <div className="flex justify-between items-start">
                        <div>
                           <h3 className="h3-orbit text-[var(--text-main)]">{editingId ? 'Edit Jurnal' : 'Tulis Jurnal'}</h3>
                           <p className="subtitle-orbit text-[var(--text-muted)] mt-1">Deskripsikan apa yang Anda kerjakan hari ini.</p>
                        </div>
                        <button type="button" onClick={() => setShowModal(false)} className="w-12 h-12 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                           <X size={24} />
                        </button>
                     </div>

                     <div className="space-y-8">
                        <div className="space-y-3">
                           <label className="label-orbit font-bold text-[var(--text-main)] flex items-center gap-2">
                              <FileText size={18} className="text-[var(--accent-blue)]" />
                              Deskripsi Kegiatan
                           </label>
                           <textarea 
                              required 
                              rows={5} 
                              value={newKegiatan.kegiatan} 
                              onChange={e => setNewKegiatan({ ...newKegiatan, kegiatan: e.target.value })} 
                              placeholder="Contoh: Mengembangkan modul autentikasi login menggunakan Next.js dan Supabase..." 
                              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-5 text-[16px] font-medium outline-none focus:ring-4 focus:ring-[var(--accent-blue)]/10 focus:bg-white transition-all shadow-inner resize-none" 
                           />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-3">
                              <label className="label-orbit font-bold text-[var(--text-main)] flex items-center gap-2">
                                 <Calendar size={18} className="text-[var(--accent-blue)]" />
                                 Tanggal
                              </label>
                              <input 
                                 type="date" 
                                 required 
                                 value={newKegiatan.tanggal} 
                                 onChange={e => setNewKegiatan({ ...newKegiatan, tanggal: e.target.value })} 
                                 className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[16px] font-medium outline-none focus:ring-4 focus:ring-[var(--accent-blue)]/10 focus:bg-white transition-all shadow-inner" 
                              />
                           </div>
                           <div className="space-y-3">
                              <label className="label-orbit font-bold text-[var(--text-main)] flex items-center gap-2">
                                 <AlertCircle size={18} className="text-[var(--accent-blue)]" />
                                 Status Kegiatan
                              </label>
                              <select 
                                 value={newKegiatan.status} 
                                 onChange={e => setNewKegiatan({ ...newKegiatan, status: e.target.value })} 
                                 className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[16px] font-medium outline-none focus:ring-4 focus:ring-[var(--accent-blue)]/10 focus:bg-white transition-all shadow-inner appearance-none cursor-pointer"
                              >
                                 <option value="Proses">Dalam Proses</option>
                                 <option value="Selesai">Selesai</option>
                              </select>
                           </div>
                        </div>
                     </div>

                     <button 
                        type="submit" 
                        disabled={submitting} 
                        className="w-full py-5 accent-gradient text-white rounded-2xl label-orbit font-bold uppercase tracking-widest shadow-xl hover:shadow-blue-200 disabled:opacity-50 transition-all active:scale-95"
                     >
                        {submitting ? 'Mengirim...' : editingId ? 'Simpan Perubahan' : 'Kirim Jurnal'}
                     </button>
                  </form>
               </div>
            </div>
         )}
      </div>
   )
}