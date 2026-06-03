'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import {
   Plus,
   Search,
   Calendar,
   Edit2,
   Trash2,
   CheckCircle2,
   Clock,
   XCircle,
   X,
   Check,
   AlertCircle,
   FileText,
   User,
   Download,
   Loader2
} from 'lucide-react'

// Memaksa Vercel agar tidak melakukan optimasi statis yang merusak pembacaan cookie Supabase auth
export const dynamic = 'force-dynamic'

export default function JurnalPage() {
   const [kegiatan, setKegiatan] = useState<any[]>([])
   const [profile, setProfile] = useState<any>(null)
   const [loading, setLoading] = useState(true)
   const [showModal, setShowModal] = useState(false)
   const [submitting, setSubmitting] = useState(false)
   const [searchQuery, setSearchQuery] = useState('')
   const [editingId, setEditingId] = useState<number | null>(null)
   const [downloadingPdf, setDownloadingPdf] = useState(false)
   const [newKegiatan, setNewKegiatan] = useState({
      kegiatan: '',
      tanggal: new Date().toISOString().split('T')[0],
      status: 'Proses'
   })

   useEffect(() => {
      fetchData()
   }, [])

   async function fetchData() {
      try {
         setLoading(true)
         const { data: { user }, error: authError } = await supabase.auth.getUser()
         if (authError || !user) {
            setLoading(false)
            return
         }

         const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()

         if (profileError) console.error('Error profile:', profileError)
         setProfile(profileData || { id: user.id, nama_lengkap: 'User' })

         const nimFilter = profileData?.nim || ''

         let query = supabase
            .from('Kegiatan')
            .select('*');

         if (nimFilter) {
            query = query.or(`nim.eq.${nimFilter},mahasiswa_id.eq.${user.id}`);
         } else {
            query = query.eq('mahasiswa_id', user.id);
         }

         // Ambil data dari tabel Kegiatan berdasarkan NIM mahasiswa aktif atau ID mahasiswa
         const { data: kegiatanData, error: kegiatanError } = await query
            .order('tanggal', { ascending: false })

         if (kegiatanError) console.error('Error kegiatan:', kegiatanError)

         // PERBAIKAN: Gunakan setKegiatan (bukan setStats) sesuai state asli halaman ini
         setKegiatan(kegiatanData || [])

      } catch (error) {
         console.error('Runtime fetch error:', error)
      } finally {
         setLoading(false)
      }
   }

   async function generatePDF() {
      setDownloadingPdf(true)
      try {
         const { data: { user }, error: authError } = await supabase.auth.getUser()
         if (authError || !user) {
            toast.error('Sesi tidak ditemukan. Silakan login kembali.')
            return
         }

         // Fetch Profile
         const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()

         if (profileError || !profileData) {
            toast.error('Gagal mengambil profil mahasiswa.')
            return
         }

         const studentName = profileData.nama_lengkap || 'Pengguna'
         const studentNim = profileData.nim || '-'

         // Fetch Absensi
         const { data: absensiData, error: absensiError } = await supabase
            .from('absensi')
            .select('*')
            .eq('mahasiswa_id', user.id)
            .order('tanggal', { ascending: true })

         if (absensiError) {
            console.error('Error fetching absensi:', absensiError)
         }

         // Fetch Jurnal Kegiatan
         let kegiatanData: any[] = []
         if (profileData.nim) {
            const { data: k, error: kError } = await supabase
               .from('Kegiatan')
               .select('*')
               .eq('nim', profileData.nim)
               .order('tanggal', { ascending: true })
            if (kError) console.error('Error fetching kegiatan:', kError)
            if (k) kegiatanData = k
         } else {
            const { data: k, error: kError } = await supabase
               .from('Kegiatan')
               .select('*')
               .eq('mahasiswa_id', user.id)
               .order('tanggal', { ascending: true })
            if (kError) console.error('Error fetching kegiatan:', kError)
            if (k) kegiatanData = k
         }

         const doc = new jsPDF()

         // Title & Header info
         doc.setFontSize(18)
         doc.setTextColor(20, 20, 20)
         doc.text("Laporan Kegiatan Magang", 14, 20)

         doc.setFontSize(10)
         doc.setTextColor(80, 80, 80)
         doc.text(`Nama Lengkap: ${studentName}`, 14, 28)
         doc.text(`NIM: ${studentNim}`, 14, 34)
         if (profileData.instansi_magang) {
            doc.text(`Instansi Magang: ${profileData.instansi_magang}`, 14, 40)
         }
         doc.text(`Tanggal Unduh: ${new Date().toLocaleDateString('id-ID')}`, 14, 46)

         // Table 1: Riwayat Presensi Harian
         doc.setFontSize(12)
         doc.setTextColor(20, 20, 20)
         doc.text("1. Riwayat Presensi Harian", 14, 56)

         const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
         const absensiBody = (absensiData || []).map(a => {
            const d = new Date(a.tanggal)
            const dateFormatted = isNaN(d.getTime()) ? a.tanggal : d.toLocaleDateString('id-ID')
            const dayName = isNaN(d.getTime()) ? '-' : days[d.getDay()]
            return [
               dateFormatted,
               dayName,
               a.check_in || '-',
               a.check_out || '-',
               a.status || '-',
               a.keterangan || '-'
            ]
         })

         autoTable(doc, {
            startY: 62,
            head: [['Tanggal', 'Hari', 'Jam Masuk', 'Jam Keluar', 'Status', 'Catatan']],
            body: absensiBody,
            theme: 'striped',
            headStyles: { fillColor: [19, 115, 51] }, // Brand Green
            styles: { fontSize: 8 },
            margin: { left: 14, right: 14 }
         })

         // Table 2: Riwayat Jurnal Kegiatan
         const finalY = (doc as any).lastAutoTable.finalY || 100
         let startYJurnal = finalY + 15
         if (startYJurnal > 250) {
            doc.addPage()
            startYJurnal = 20
         }

         doc.setFontSize(12)
         doc.setTextColor(20, 20, 20)
         doc.text("2. Riwayat Jurnal Kegiatan", 14, startYJurnal)

         const kegiatanBody = kegiatanData.map(k => {
            const d = new Date(k.tanggal)
            const dateFormatted = isNaN(d.getTime()) ? k.tanggal : d.toLocaleDateString('id-ID')
            return [
               dateFormatted,
               k.kegiatan || '-',
               k.status || 'Proses',
               k.status_persetujuan || 'Menunggu',
               k.komentar_dosen || '-'
            ]
         })

         autoTable(doc, {
            startY: startYJurnal + 4,
            head: [['Tanggal', 'Aktivitas / Kegiatan', 'Status Progress', 'Persetujuan', 'Komentar Dosen']],
            body: kegiatanBody,
            theme: 'striped',
            headStyles: { fillColor: [19, 115, 51] }, // Brand Green
            styles: { fontSize: 8 },
            columnStyles: {
               1: { cellWidth: 90 },
               4: { cellWidth: 35 }
            },
            margin: { left: 14, right: 14 }
         })

         doc.save(`Laporan_Magang_${studentNim}_${studentName.replace(/\s+/g, '_')}.pdf`)
         toast.success('Laporan PDF berhasil diunduh')

      } catch (error: any) {
         console.error('PDF Generation Error:', error)
         toast.error('Gagal membuat laporan PDF: ' + error.message)
      } finally {
         setDownloadingPdf(false)
      }
   }

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault()

      if (!profile) {
         toast.error('Data profil belum siap. Silakan muat ulang.')
         return
      }

      setSubmitting(true)
      try {
         const payload = {
            kegiatan: newKegiatan.kegiatan,
            tanggal: newKegiatan.tanggal,
            status: newKegiatan.status,
            nim: profile?.nim || '',
            nama_mahasiswa: profile?.nama_lengkap || 'Pengguna',
            mahasiswa_id: profile?.id || null
         }

         if (editingId) {
            const { error } = await supabase
               .from('Kegiatan')
               .update(payload)
               .eq('id', editingId)

            if (error) throw error
            toast.success('Jurnal berhasil diperbarui')
         } else {
            const { error } = await supabase
               .from('Kegiatan')
               .insert([payload])

            if (error) throw error
            toast.success('Jurnal berhasil ditambahkan')
         }

         setShowModal(false)
         resetForm()
         fetchData()
      } catch (error: any) {
         toast.error('Gagal menyimpan: ' + error.message)
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
      if (!item) return
      setNewKegiatan({
         kegiatan: item.kegiatan || '',
         tanggal: item.tanggal || new Date().toISOString().split('T')[0],
         status: item.status || 'Proses'
      })
      setEditingId(item.id)
      setShowModal(true)
   }

   // Loading Boundary Check - Strict
   if (loading) {
      return (
         <div className="fixed inset-0 z-[999] bg-[#F8F9FA] flex items-center justify-center">
            <div className="text-center space-y-6">
               <div className="w-16 h-16 border-4 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin mx-auto shadow-sm"></div>
               <div className="space-y-2">
                  <p className="text-[var(--text-main)] font-bold text-lg tracking-tight">Sinkronisasi Data ORBIT</p>
                  <p className="text-[var(--text-light)] text-sm animate-pulse">Menghubungkan ke server aman...</p>
               </div>
            </div>
         </div>
      )
   }

   // Safe-guarding data structures
   const safeKegiatan = Array.isArray(kegiatan) ? kegiatan : []
   const filteredKegiatan = safeKegiatan.filter(k =>
      k && typeof k.kegiatan === 'string' && k.kegiatan.toLowerCase().includes(searchQuery.toLowerCase())
   )

   return (
      <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
         {/* Header Area */}
         <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
               <h1 className="h1-orbit text-[var(--text-main)]">Jurnal Kegiatan</h1>
               <p className="subtitle-orbit text-[var(--text-muted)] mt-1">
                  Catat aktivitas harian untuk {profile?.nama_lengkap ?? 'Pengguna'}.
               </p>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-4">
               <button
                  onClick={generatePDF}
                  disabled={downloadingPdf}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 font-semibold text-sm"
               >
                  {downloadingPdf ? (
                     <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  ) : (
                     <Download size={20} className="text-blue-600" />
                  )}
                  <span>Unduh Laporan PDF</span>
               </button>
               <button
                  onClick={() => { resetForm(); setShowModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm"
               >
                  <Plus size={20} />
                  <span>Tambah Jurnal</span>
               </button>
            </div>
         </div>

         <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="w-full lg:w-80 space-y-6">
               <div className="neumorphic-card p-8 shadow-sm">
                  <h4 className="label-orbit font-bold text-[var(--text-main)] mb-6">Pencarian Jurnal</h4>
                  <div className="relative">
                     <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-light)]" />
                     <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari kata kunci..."
                        className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-gray-100 text-[14px] font-medium outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/20 transition-all"
                     />
                  </div>
               </div>

               {/* Metrics with Strict Array Guards */}
               <div className="neumorphic-card p-8 shadow-sm">
                  <h4 className="label-orbit font-bold text-[var(--text-main)] mb-6">Status Ringkasan</h4>
                  <div className="space-y-4">
                     <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                        <div className="flex items-center gap-3">
                           <Clock size={16} className="text-blue-600" />
                           <span className="caption-orbit font-bold text-blue-700">MENUNGGU</span>
                        </div>
                        <span className="body2-orbit font-bold text-blue-800">
                           {(Array.isArray(safeKegiatan) ? safeKegiatan : []).filter(k => k && (!k.status_persetujuan || k.status_persetujuan === 'Menunggu')).length}
                        </span>
                     </div>
                     <div className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                        <div className="flex items-center gap-3">
                           <CheckCircle2 size={16} className="text-emerald-600" />
                           <span className="caption-orbit font-bold text-emerald-700">DISETUJUI</span>
                        </div>
                        <span className="body2-orbit font-bold text-emerald-800">
                           {(Array.isArray(safeKegiatan) ? safeKegiatan : []).filter(k => k && k.status_persetujuan === 'Disetujui').length}
                        </span>
                     </div>
                     <div className="flex items-center justify-between p-4 bg-red-50/50 rounded-2xl border border-red-100/50">
                        <div className="flex items-center gap-3">
                           <XCircle size={16} className="text-red-600" />
                           <span className="caption-orbit font-bold text-red-700">DITOLAK</span>
                        </div>
                        <span className="body2-orbit font-bold text-red-800">
                           {(Array.isArray(safeKegiatan) ? safeKegiatan : []).filter(k => k && k.status_persetujuan === 'Ditolak').length}
                        </span>
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex-1 space-y-6 w-full">
               {(Array.isArray(filteredKegiatan) ? filteredKegiatan : []).length > 0 ? (Array.isArray(filteredKegiatan) ? filteredKegiatan : []).map((item) => (
                  <div key={item?.id ?? Math.random()} className="neumorphic-card p-8 group hover:scale-[1.01] transition-all duration-300 shadow-sm border border-transparent hover:border-gray-100">
                     <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex gap-6">
                           <div className="hidden md:flex flex-col items-center justify-center w-20 h-20 rounded-3xl bg-gray-50 shrink-0 border border-gray-100 shadow-inner">
                              <span className="h3-orbit text-[var(--text-main)] leading-none">
                                 {item?.tanggal ? new Date(item.tanggal).getDate() : '--'}
                              </span>
                              <span className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest mt-1">
                                 {item?.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { month: 'short' }) : '---'}
                              </span>
                           </div>
                           <div className="space-y-4">
                              <div className="flex flex-wrap items-center gap-3">
                                 <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${item?.status_persetujuan === 'Disetujui'
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    : item?.status_persetujuan === 'Ditolak'
                                       ? 'bg-red-50 text-red-600 border-red-100'
                                       : 'bg-orange-50 text-orange-600 border-orange-100'
                                    }`}>
                                    {item?.status_persetujuan ?? 'Menunggu'}
                                 </span>
                                 <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${item?.status === 'Selesai' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-50 text-gray-600 border border-gray-100'}`}>
                                    {item?.status ?? 'Proses'}
                                 </span>
                              </div>
                              <h3 className="body1-orbit font-bold text-[var(--text-main)] leading-relaxed">
                                 {item?.kegiatan ?? 'Deskripsi tidak tersedia'}
                              </h3>
                              <p className="caption-orbit text-[var(--text-light)] font-medium md:hidden">
                                 {item?.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                              </p>
                           </div>
                        </div>

                        <div className="flex md:flex-col items-center justify-between md:justify-start gap-4">
                           {item?.status_persetujuan !== 'Disetujui' && (
                              <div className="flex md:flex-col gap-3">
                                 <button
                                    onClick={() => openEdit(item)}
                                    className="w-10 h-10 flex items-center justify-center bg-white text-[var(--text-muted)] hover:bg-blue-50 hover:text-[var(--accent-blue)] rounded-xl transition-all shadow-sm border border-gray-100"
                                    title="Edit Jurnal"
                                 >
                                    <Edit2 size={18} />
                                 </button>
                                 <button
                                    onClick={() => item?.id && handleDelete(item.id)}
                                    className="w-10 h-10 flex items-center justify-center bg-white text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 rounded-xl transition-all shadow-sm border border-gray-100"
                                    title="Hapus Jurnal"
                                 >
                                    <Trash2 size={18} />
                                 </button>
                              </div>
                           )}
                           {item?.status_persetujuan === 'Disetujui' && (
                              <div className="w-12 h-12 flex items-center justify-center text-emerald-500 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
                                 <Check size={24} strokeWidth={3} />
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               )) : (
                  <div className="neumorphic-card py-24 text-center space-y-8 shadow-sm">
                     <div className="w-24 h-24 bg-gray-50 rounded-[32px] flex items-center justify-center mx-auto text-[var(--text-light)] shadow-inner border border-gray-100">
                        <FileText size={48} />
                     </div>
                     <div className="max-w-xs mx-auto">
                        <h4 className="h4-orbit text-[var(--text-main)]">Kosong</h4>
                        <p className="body2-orbit text-[var(--text-muted)] mt-2">
                           Belum ada catatan jurnal yang sesuai dengan pencarian Anda.
                        </p>
                     </div>
                     <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm"
                     >
                        Tulis Jurnal Sekarang
                     </button>
                  </div>
               )}
            </div>
         </div>

         {/* Modal with Safety Checks */}
         {showModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
               <div className="neumorphic-card w-full max-w-2xl p-10 relative z-10 animate-in zoom-in-95 duration-300 shadow-2xl overflow-hidden">
                  <div className="absolute top-0 right-0 p-8">
                     <button type="button" onClick={() => setShowModal(false)} className="w-12 h-12 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-sm flex items-center justify-center transition-all">
                        <X size={24} />
                     </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-10">
                     <div>
                        <h3 className="h2-orbit text-[var(--text-main)]">{editingId ? 'Perbarui Catatan' : 'Tambah Jurnal Baru'}</h3>
                        <p className="subtitle-orbit text-[var(--text-muted)] mt-1">Detail aktivitas magang harian Anda.</p>
                     </div>

                     <div className="space-y-8">
                        <div className="space-y-3">
                           <label className="label-orbit font-bold text-[var(--text-main)] flex items-center gap-2">
                              <FileText size={18} className="text-[var(--accent-blue)]" />
                              Deskripsi Aktivitas
                           </label>
                           <textarea
                              required
                              rows={5}
                              value={newKegiatan.kegiatan}
                              onChange={e => setNewKegiatan({ ...newKegiatan, kegiatan: e.target.value })}
                              placeholder="Gunakan kalimat yang jelas dan mendetail..."
                              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-5 text-[16px] font-medium outline-none focus:ring-4 focus:ring-[var(--accent-blue)]/10 focus:bg-white transition-all shadow-inner resize-none"
                           />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-3">
                              <label className="label-orbit font-bold text-[var(--text-main)] flex items-center gap-2">
                                 <Calendar size={18} className="text-[var(--accent-blue)]" />
                                 Tanggal Kegiatan
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
                                 <Clock size={18} className="text-[var(--accent-blue)]" />
                                 Status Progress
                              </label>
                              <div className="relative">
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
                     </div>

                     <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-5 accent-gradient text-white rounded-2xl label-orbit font-bold uppercase tracking-widest shadow-xl shadow-blue-200/50 disabled:opacity-50 transition-all active:scale-[0.98]"
                     >
                        {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Publikasikan Jurnal'}
                     </button>
                  </form>
               </div>
            </div>
         )}
      </div>
   )
}