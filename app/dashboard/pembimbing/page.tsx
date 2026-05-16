'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  Search, 
  User as UserIcon, 
  School, 
  BadgeCheck, 
  Users, 
  AlertCircle,
  X,
  Check,
  ChevronRight,
  MapPin,
  Building
} from 'lucide-react'

type Dosen = {
  id: string
  nama_lengkap: string
  nip: string | null
  department: string | null
  faculty: string | null
  max_mahasiswa: number
  enrolled_count: number
}

type Profile = {
  id: string
  dosen_id: string | null
  enrollment_date: string | null
}

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-teal-500',
]

export default function PembimbingPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [currentDosen, setCurrentDosen] = useState<Dosen | null>(null)
  const [availableDosen, setAvailableDosen] = useState<Dosen[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [unloading, setUnloading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState<Dosen | null>(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: studentData } = await supabase.from('profiles').select('id, dosen_id, enrollment_date').eq('id', user.id).single()
      setProfile(studentData)

      if (studentData?.dosen_id) {
        const [dosenRes, countRes] = await Promise.all([
          supabase.from('profiles').select('id, nama_lengkap, nip, department, faculty, max_mahasiswa').eq('id', studentData.dosen_id).single(),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('dosen_id', studentData.dosen_id).eq('role', 'mahasiswa')
        ])
        if (dosenRes.data) {
          setCurrentDosen({ ...dosenRes.data, enrolled_count: countRes.count || 0 } as any)
        }
      } else {
        const { data: allDosen } = await supabase.from('profiles').select('id, nama_lengkap, nip, department, faculty, max_mahasiswa').eq('role', 'dosen')
        const { data: allStudents } = await supabase.from('profiles').select('dosen_id').eq('role', 'mahasiswa').not('dosen_id', 'is', null)
        const dosenCounts = (allStudents || []).reduce((acc, curr) => {
          if (curr.dosen_id) acc[curr.dosen_id] = (acc[curr.dosen_id] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        const dosenList = (allDosen || []).map(d => ({ 
          ...d, 
          max_mahasiswa: d.max_mahasiswa || 10, 
          enrolled_count: dosenCounts[d.id] || 0 
        })) as Dosen[]
        setAvailableDosen(dosenList)
      }
    } catch (error: any) {
      toast.error('Gagal memuat data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleEnroll() {
    if (!showConfirmModal) return
    const dosen = showConfirmModal
    const remaining = dosen.max_mahasiswa - dosen.enrolled_count
    if (remaining <= 0) return toast.error('Kapasitas penuh')
    
    setEnrolling(dosen.id)
    try {
      const now = new Date().toISOString()
      const { error } = await supabase.from('profiles').update({ dosen_id: dosen.id, enrollment_date: now }).eq('id', profile?.id)
      if (error) throw error
      toast.success('Berhasil memilih pembimbing')
      setShowConfirmModal(null)
      fetchData()
    } catch (error: any) {
      toast.error('Gagal: ' + error.message)
    } finally {
      setEnrolling(null)
    }
  }

  async function handleUnenroll() {
    if (!confirm('Batalkan pendaftaran pembimbing?')) return
    setUnloading(true)
    try {
      const { error } = await supabase.from('profiles').update({ dosen_id: null, enrollment_date: null }).eq('id', profile?.id)
      if (error) throw error
      toast.success('Pendaftaran dibatalkan')
      setCurrentDosen(null)
      fetchData()
    } catch (error: any) {
      toast.error('Gagal: ' + error.message)
    } finally {
      setUnloading(false)
    }
  }

  const filteredDosen = availableDosen.filter(d => 
    d.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.nip?.includes(searchQuery)
  )

  if (loading) return null

  return (
    <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div>
           <h1 className="h1-orbit text-[var(--text-main)]">Pembimbing Magang</h1>
           <p className="subtitle-orbit text-[var(--text-muted)] mt-1">Kelola dan pilih dosen pembimbing untuk program magang Anda.</p>
        </div>
        {currentDosen && (
          <button 
            onClick={handleUnenroll}
            disabled={unloading}
            className="neumorphic-button flex items-center gap-2 text-red-600 hover:bg-red-50 transition-colors"
          >
            <X size={20} />
            <span className="label-orbit font-bold">Ganti Pembimbing</span>
          </button>
        )}
      </div>

      {currentDosen ? (
        <section className="neumorphic-card p-10 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 px-8 py-3 accent-gradient text-white rounded-bl-[24px] shadow-lg flex items-center gap-2">
             <BadgeCheck size={18} />
             <span className="caption-orbit font-bold uppercase tracking-widest">Pembimbing Anda</span>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-12">
            <div className={`w-48 h-48 rounded-[32px] ${AVATAR_COLORS[0]} flex-shrink-0 flex items-center justify-center shadow-2xl border-4 border-white overflow-hidden relative group`}>
               <span className="text-7xl font-bold text-white group-hover:scale-110 transition-transform">
                  {currentDosen.nama_lengkap.charAt(0).toUpperCase()}
               </span>
            </div>

            <div className="flex-1 text-center md:text-left space-y-10">
               <div>
                  <h2 className="h2-orbit text-[var(--text-main)]">{currentDosen.nama_lengkap}</h2>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start mt-4">
                     <span className="px-5 py-2 bg-gray-50 text-[var(--text-muted)] rounded-full label-orbit flex items-center gap-2 border border-gray-100">
                        <BadgeCheck size={18} className="text-[var(--accent-blue)]" />
                        NIP: {currentDosen.nip || '-'}
                     </span>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-gray-100 pt-10">
                  <div className="space-y-2">
                     <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Fakultas</p>
                     <p className="body1-orbit font-bold text-[var(--text-main)] flex items-center gap-3">
                        <School size={20} className="text-[var(--accent-blue)]" />
                        {currentDosen.faculty || '-'}
                     </p>
                  </div>
                  <div className="space-y-2">
                     <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Departemen / Prodi</p>
                     <p className="body1-orbit font-bold text-[var(--text-main)] flex items-center gap-3">
                        <Building size={20} className="text-[var(--accent-blue)]" />
                        {currentDosen.department || '-'}
                     </p>
                  </div>
               </div>

               <div className="pt-6">
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                     <Users size={20} />
                     <span className="label-orbit font-bold">Kapasitas Mahasiswa: {currentDosen.enrolled_count} / {currentDosen.max_mahasiswa}</span>
                  </div>
               </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="space-y-12">
           {/* Info Section */}
           <section className="neumorphic-card p-10 accent-gradient text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                 <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shrink-0 shadow-lg">
                    <School size={40} />
                 </div>
                 <div className="text-center md:text-left">
                    <h4 className="h4-orbit font-bold">Pilih Pembimbing Anda</h4>
                    <p className="body2-orbit opacity-90 mt-2 max-w-2xl">
                       Anda belum memiliki dosen pembimbing. Silakan pilih dari daftar dosen yang tersedia sesuai dengan fakultas dan departemen Anda.
                    </p>
                 </div>
              </div>
           </section>

           {/* Filter & Search */}
           <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
              <h4 className="h4-orbit text-[var(--text-main)]">Dosen yang Tersedia</h4>
              <div className="relative w-full md:w-80">
                 <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-light)]" />
                 <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama, prodi, atau NIP..." 
                    className="w-full pl-14 pr-6 py-4 bg-white rounded-full border border-gray-100 text-[16px] font-medium outline-none focus:ring-4 focus:ring-[var(--accent-blue)]/10 transition-all shadow-sm" 
                 />
              </div>
           </div>

           {/* Mentors Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredDosen.length > 0 ? filteredDosen.map((dosen, idx) => {
                const remaining = dosen.max_mahasiswa - dosen.enrolled_count
                const isFull = remaining <= 0
                const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length]

                return (
                  <div key={dosen.id} className="neumorphic-card p-8 flex flex-col justify-between group hover:scale-[1.02] transition-all duration-300">
                     <div>
                        <div className="flex justify-between items-start mb-8">
                           <div className={`w-16 h-16 rounded-2xl ${colorClass} flex items-center justify-center text-white shadow-lg group-hover:rotate-3 transition-transform`}>
                              <span className="text-2xl font-bold">{dosen.nama_lengkap.charAt(0)}</span>
                           </div>
                           <div className={`px-4 py-1.5 rounded-full caption-orbit font-bold uppercase tracking-widest ${isFull ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                              {isFull ? 'Penuh' : `${remaining} Slot Sisa`}
                           </div>
                        </div>
                        
                        <h3 className="body1-orbit font-bold text-[var(--text-main)] mb-1 group-hover:text-[var(--accent-blue)] transition-colors">{dosen.nama_lengkap}</h3>
                        <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest mb-8">NIP: {dosen.nip || '-'}</p>
                        
                        <div className="space-y-4 mb-10 border-t border-gray-50 pt-6">
                           <div className="flex justify-between items-center">
                              <span className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Fakultas</span>
                              <span className="body2-orbit font-bold text-[var(--text-main)] truncate max-w-[140px]">{dosen.faculty || '-'}</span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Prodi</span>
                              <span className="body2-orbit font-bold text-[var(--text-main)] truncate max-w-[140px]">{dosen.department || '-'}</span>
                           </div>
                        </div>
                     </div>
                     
                     <button
                       onClick={() => setShowConfirmModal(dosen)}
                       disabled={isFull}
                       className={`w-full py-4 rounded-2xl label-orbit font-bold uppercase tracking-widest transition-all ${
                         isFull 
                           ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                           : 'accent-gradient text-white shadow-xl hover:shadow-blue-200 active:scale-95'
                       }`}
                     >
                       {isFull ? 'Kapasitas Penuh' : 'Pilih Pembimbing'}
                     </button>
                  </div>
                )
              }) : (
                 <div className="col-span-full neumorphic-card p-20 text-center text-[var(--text-light)] body1-orbit">
                    Tidak ditemukan dosen pembimbing yang sesuai dengan pencarian Anda.
                 </div>
              )}
           </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="neumorphic-card max-w-md w-full p-10 text-center space-y-8 animate-in zoom-in-95 duration-300">
               <div className="w-20 h-20 bg-blue-50 text-[var(--accent-blue)] rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                  <AlertCircle size={40} />
               </div>
               <div>
                  <h3 className="h4-orbit text-[var(--text-main)]">Konfirmasi Pemilihan</h3>
                  <p className="body2-orbit text-[var(--text-muted)] mt-4">
                     Apakah Anda yakin ingin memilih <span className="font-bold text-[var(--text-main)]">{showConfirmModal.nama_lengkap}</span> sebagai dosen pembimbing Anda?
                  </p>
               </div>
               <div className="flex gap-4 pt-4">
                  <button 
                     onClick={() => setShowConfirmModal(null)}
                     className="flex-1 py-4 rounded-2xl label-orbit font-bold text-[var(--text-muted)] bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                     Batal
                  </button>
                  <button 
                     onClick={handleEnroll}
                     disabled={enrolling !== null}
                     className="flex-1 py-4 rounded-2xl label-orbit font-bold text-white accent-gradient shadow-lg disabled:opacity-50"
                  >
                     {enrolling ? 'Memproses...' : 'Ya, Pilih'}
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  )
}
