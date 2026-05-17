'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Users, 
  Search, 
  Check, 
  ShieldCheck, 
  User as UserIcon,
  ChevronRight,
  Info
} from 'lucide-react'
import { toast } from 'sonner'

// Memaksa rendering dinamis untuk menghindari cache statis di Vercel
export const dynamic = 'force-dynamic'

export default function PembimbingPage() {
  const [dosenList, setDosenList] = useState<any[]>([])
  const [selectedDosen, setSelectedDosen] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [profile, setProfile] = useState<any>(null)

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
      
      // Fetch profile mahasiswa
      const { data: profileData, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (pErr) console.error('Profile fetch error:', pErr)
      setProfile(profileData || { id: user.id })

      const currentDosenId = profileData?.dosen_id

      // Fetch semua dosen secara paralel
      const [dosenResponse, selectedDosenResponse] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'dosen'),
        currentDosenId 
          ? supabase.from('profiles').select('*').eq('id', currentDosenId).maybeSingle()
          : Promise.resolve({ data: null })
      ])

      setDosenList(Array.isArray(dosenResponse.data) ? dosenResponse.data : [])
      
      if (selectedDosenResponse.data) {
        // Fetch stats untuk dosen yang terpilih saja (opsional)
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('dosen_id', currentDosenId)
        
        setSelectedDosen({
          ...selectedDosenResponse.data,
          studentCount: count || 0
        })
      }
    } catch (e) {
      console.error('Critical data fetch error:', e)
      toast.error('Gagal memuat data pembimbing.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSelectDosen(dosenId: string) {
    if (!profile?.id) return
    if (!confirm('Pilih dosen ini sebagai pembimbing magang Anda?')) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ dosen_id: dosenId })
        .eq('id', profile.id)

      if (error) throw error
      
      toast.success('Berhasil memilih pembimbing')
      fetchData() // Refresh data
    } catch (error: any) {
      toast.error('Gagal memilih: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Strict Loading Boundary
  if (loading) {
    return (
      <div className="fixed inset-0 z-[999] bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 border-4 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[var(--text-main)] font-bold text-lg tracking-tight">Menghubungkan ke Tim Dosen...</p>
        </div>
      </div>
    )
  }

  const filteredDosen = (Array.isArray(dosenList) ? dosenList : []).filter(d => 
    d && d.nama_lengkap?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div>
          <h1 className="h1-orbit text-[var(--text-main)]">Dosen Pembimbing</h1>
          <p className="subtitle-orbit text-[var(--text-muted)] mt-1">Konsultasikan aktivitas magang dengan dosen pilihan Anda.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-6 py-3 bg-blue-50 rounded-full border border-blue-100 flex items-center gap-3">
            <Users size={18} className="text-[var(--accent-blue)]" />
            <span className="caption-orbit font-bold text-[var(--text-main)]">
              {dosenList.length} Dosen Tersedia
            </span>
          </div>
        </div>
      </div>

      {/* Selected Dosen View */}
      {selectedDosen ? (
        <div className="neumorphic-card p-10 md:p-14 overflow-hidden relative shadow-sm border border-transparent hover:border-blue-100/50 transition-all">
          <div className="absolute right-0 top-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-40"></div>
          <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
            <div className="w-40 h-40 rounded-[48px] accent-gradient border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
               {selectedDosen.avatar_url ? (
                 <img src={selectedDosen.avatar_url} className="w-full h-full object-cover" />
               ) : (
                 <span className="text-6xl font-bold text-white">{(selectedDosen.nama_lengkap ?? 'D').charAt(0)}</span>
               )}
            </div>
            <div className="flex-1 space-y-6 text-center md:text-left">
              <div>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-4">
                   <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
                     <ShieldCheck size={14} /> Pembimbing Aktif Anda
                   </span>
                </div>
                <h2 className="h2-orbit text-[var(--text-main)] leading-tight">{selectedDosen.nama_lengkap}</h2>
                <p className="body1-orbit text-[var(--text-muted)] mt-2 font-medium">{selectedDosen.nim || 'NIDN/NIP ---'}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-gray-100">
                <div>
                   <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Fakultas / Prodi</p>
                   <p className="body2-orbit font-bold text-[var(--text-main)] mt-1">{selectedDosen.prodi || 'Sains & Teknologi'}</p>
                </div>
                <div>
                   <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Status</p>
                   <p className="body2-orbit font-bold text-emerald-600 mt-1 flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Bersedia
                   </p>
                </div>
                <div className="col-span-2 md:col-span-1">
                   <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-widest">Total Bimbingan</p>
                   <p className="body2-orbit font-bold text-[var(--text-main)] mt-1">{selectedDosen.studentCount ?? 0} Mahasiswa</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="neumorphic-card p-12 text-center space-y-6 shadow-sm border border-dashed border-gray-200">
          <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center mx-auto text-[var(--text-light)]">
             <UserIcon size={40} />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="h4-orbit text-[var(--text-main)]">Belum Memiliki Pembimbing</h3>
            <p className="body2-orbit text-[var(--text-muted)] mt-2">
              Silakan pilih salah satu dosen di bawah ini untuk menjadi pembimbing magang Anda agar jurnal kegiatan dapat divalidasi.
            </p>
          </div>
        </div>
      )}

      {/* Dosen Selection Grid */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
          <h3 className="h4-orbit text-[var(--text-main)]">Pilih Dosen Lainnya</h3>
          <div className="relative md:w-80">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-light)]" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama dosen..." 
              className="w-full pl-12 pr-6 py-4 bg-white rounded-full border border-gray-100 text-[14px] font-medium outline-none focus:ring-4 focus:ring-[var(--accent-blue)]/10 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDosen.length > 0 ? filteredDosen.map((dosen) => (
            <div 
              key={dosen?.id ?? Math.random()} 
              className={`neumorphic-card p-8 group hover:scale-[1.02] transition-all duration-300 relative overflow-hidden shadow-sm ${selectedDosen?.id === dosen.id ? 'ring-2 ring-[var(--accent-blue)] border-transparent' : 'hover:border-blue-100'}`}
            >
              <div className="flex items-start justify-between mb-8">
                 <div className="w-16 h-16 rounded-2xl accent-gradient flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {dosen.avatar_url ? (
                      <img src={dosen.avatar_url} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      (dosen.nama_lengkap ?? 'D').charAt(0)
                    )}
                 </div>
                 {selectedDosen?.id === dosen.id && (
                    <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-500">
                       <Check size={18} strokeWidth={3} />
                    </div>
                 )}
              </div>
              
              <div className="space-y-2">
                 <h4 className="body2-orbit font-bold text-[var(--text-main)] group-hover:text-[var(--accent-blue)] transition-colors line-clamp-1">{dosen.nama_lengkap}</h4>
                 <p className="caption-orbit font-bold text-[var(--text-light)] uppercase tracking-wider">{dosen.nim || 'Dosen Tetap'}</p>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[var(--text-light)] uppercase tracking-tighter">Penempatan</span>
                    <span className="text-xs font-bold text-[var(--text-muted)]">{dosen.prodi || 'Universitas'}</span>
                 </div>
                 {selectedDosen?.id !== dosen.id && (
                   <button 
                     onClick={() => handleSelectDosen(dosen.id)}
                     disabled={submitting}
                     className="px-5 py-2.5 bg-gray-50 text-[var(--accent-blue)] rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--accent-blue)] hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
                   >
                     Pilih
                   </button>
                 )}
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center">
               <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <Search size={32} />
               </div>
               <p className="body2-orbit text-[var(--text-muted)] italic">Tidak menemukan dosen dengan nama tersebut.</p>
            </div>
          )}
        </div>
      </div>

      <div className="neumorphic-card p-8 bg-slate-900 text-white shadow-xl shadow-slate-200">
         <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md shrink-0">
               <Info className="text-blue-400" size={24} />
            </div>
            <div>
               <h4 className="body1-orbit font-bold">Informasi Penting</h4>
               <p className="caption-orbit mt-1 opacity-70 leading-relaxed font-medium">
                  Setelah memilih dosen pembimbing, pastikan Anda melakukan koordinasi secara berkala. Jurnal kegiatan harian Anda akan diverifikasi langsung oleh beliau melalui portal khusus dosen.
               </p>
            </div>
         </div>
      </div>
    </div>
  )
}
