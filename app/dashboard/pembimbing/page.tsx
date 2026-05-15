'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

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

export default function PembimbingPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [currentDosen, setCurrentDosen] = useState<Dosen | null>(null)
  const [availableDosen, setAvailableDosen] = useState<Dosen[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [unloading, setUnloading] = useState(false)

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
          setCurrentDosen({ ...dosenRes.data, enrolled_count: countRes.count || 0 })
        }
      } else {
        const { data: allDosen } = await supabase.from('profiles').select('id, nama_lengkap, nip, department, faculty, max_mahasiswa').eq('role', 'dosen')
        const { data: allStudents } = await supabase.from('profiles').select('dosen_id').eq('role', 'mahasiswa').not('dosen_id', 'is', null)
        const dosenCounts = (allStudents || []).reduce((acc, curr) => {
          if (curr.dosen_id) acc[curr.dosen_id] = (acc[curr.dosen_id] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        const dosenList = (allDosen || []).map(d => ({ ...d, max_mahasiswa: d.max_mahasiswa || 10, enrolled_count: dosenCounts[d.id] || 0 }))
        setAvailableDosen(dosenList)
      }
    } catch (error: any) {
      toast.error('Gagal memuat data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleEnroll(dosenId: string, availableSlots: number) {
    if (availableSlots <= 0) return toast.error('Kapasitas penuh')
    if (!confirm('Daftar ke dosen ini?')) return
    setEnrolling(dosenId)
    try {
      const now = new Date().toISOString()
      const { error } = await supabase.from('profiles').update({ dosen_id: dosenId, enrollment_date: now }).eq('id', profile?.id)
      if (error) throw error
      toast.success('Berhasil mendaftar')
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

  if (loading) return null

  return (
    <div className="space-y-10 pb-20">
      {/* Header Area */}
      <div>
         <h1 className="text-[28px] font-black tracking-tight text-[var(--text-main)]">Internship Supervisor</h1>
         <p className="text-[14px] font-medium text-[var(--text-muted)]">Connect and manage your academic mentorship</p>
      </div>

      {currentDosen ? (
        <section className="bento-card relative overflow-hidden flex flex-col md:flex-row items-center md:items-start gap-12 py-12">
          <div className="absolute top-0 right-0 px-6 py-2 bg-emerald-50 text-emerald-600 rounded-bl-[var(--radius-lg)] border-b border-l border-emerald-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
             <span className="material-symbols-outlined text-[16px] fill-icon">verified</span>
             Assigned
          </div>

          <div className="w-40 h-40 rounded-[var(--radius-xl)] bg-[var(--accent)] flex-shrink-0 flex items-center justify-center shadow-xl shadow-blue-100 border-4 border-white overflow-hidden relative group">
             {/* Initials fallback */}
             <span className="text-6xl font-black text-white group-hover:scale-110 transition-transform">
                {currentDosen.nama_lengkap.charAt(0).toUpperCase()}
             </span>
          </div>

          <div className="flex-1 text-center md:text-left space-y-8">
             <div>
                <h2 className="text-[32px] font-black text-[var(--text-main)] leading-tight tracking-tight">{currentDosen.nama_lengkap}</h2>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start mt-3">
                   <span className="px-4 py-1.5 bg-[var(--bg-app)] text-[var(--text-muted)] rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-[var(--border)]">
                      <span className="material-symbols-outlined text-[16px]">badge</span>
                      NIP: {currentDosen.nip || '-'}
                   </span>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-[var(--border-light)] pt-8">
                <div>
                   <p className="text-[10px] font-black text-[var(--text-light)] uppercase tracking-widest mb-1">Faculty</p>
                   <p className="text-[16px] font-bold text-[var(--text-main)]">{currentDosen.faculty || '-'}</p>
                </div>
                <div>
                   <p className="text-[10px] font-black text-[var(--text-light)] uppercase tracking-widest mb-1">Department</p>
                   <p className="text-[16px] font-bold text-[var(--text-main)]">{currentDosen.department || '-'}</p>
                </div>
             </div>

             <div className="flex flex-col md:flex-row items-center gap-4 pt-6">
                <button
                  onClick={handleUnenroll}
                  disabled={unloading}
                  className="px-8 py-3.5 bg-[var(--bg-app)] text-red-600 border border-red-100 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-all flex items-center gap-3 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">person_remove</span>
                  {unloading ? 'PROCESSING...' : 'REQUEST CHANGE'}
                </button>
             </div>
          </div>
        </section>
      ) : (
        <div className="space-y-10">
           {/* Info Banner */}
           <section className="bg-[var(--accent)] p-8 rounded-[var(--radius-lg)] flex items-start gap-6 text-white overflow-hidden relative shadow-xl shadow-blue-100">
              <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
                 <span className="material-symbols-outlined text-[32px]">group_add</span>
              </div>
              <div className="relative z-10">
                 <h4 className="text-[18px] font-black">Choose Your Mentor</h4>
                 <p className="text-[14px] font-medium opacity-80 mt-1 max-w-xl leading-relaxed">
                    You currently don't have an assigned supervisor. Please review the list below and select a lecturer who matches your department and expertise.
                 </p>
              </div>
           </section>

           {/* Mentors Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableDosen.map(dosen => {
                const remaining = dosen.max_mahasiswa - dosen.enrolled_count
                const isFull = remaining <= 0

                return (
                  <div key={dosen.id} className="bento-card group flex flex-col justify-between">
                     <div>
                        <div className="flex justify-between items-start mb-6">
                           <div className="w-14 h-14 rounded-2xl bg-[var(--bg-app)] flex items-center justify-center text-[var(--text-light)] group-hover:bg-[var(--accent)] group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-100 transition-all">
                              <span className="material-symbols-outlined text-[32px]">school</span>
                           </div>
                           <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${isFull ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                              {isFull ? 'Full' : `${remaining} Slot`}
                           </div>
                        </div>
                        <h3 className="text-[18px] font-black text-[var(--text-main)] mb-1 group-hover:text-[var(--accent)] transition-colors">{dosen.nama_lengkap}</h3>
                        <p className="text-[11px] font-bold text-[var(--text-light)] uppercase tracking-widest mb-6">NIP: {dosen.nip || '-'}</p>
                        
                        <div className="space-y-4 mb-8">
                           <div className="flex justify-between items-center py-2 border-b border-[var(--border-light)]">
                              <span className="text-[10px] font-black text-[var(--text-light)] uppercase tracking-widest">Faculty</span>
                              <span className="text-[12px] font-bold text-[var(--text-main)] truncate max-w-[120px]">{dosen.faculty || '-'}</span>
                           </div>
                           <div className="flex justify-between items-center py-2 border-b border-[var(--border-light)]">
                              <span className="text-[10px] font-black text-[var(--text-light)] uppercase tracking-widest">Prodi</span>
                              <span className="text-[12px] font-bold text-[var(--text-main)] truncate max-w-[120px]">{dosen.department || '-'}</span>
                           </div>
                        </div>
                     </div>
                     
                     <button
                       onClick={() => handleEnroll(dosen.id, remaining)}
                       disabled={isFull || enrolling === dosen.id}
                       className="w-full py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50 bg-[var(--text-main)] text-white hover:bg-[var(--accent)] shadow-lg shadow-slate-100"
                     >
                       {enrolling === dosen.id ? 'PENDING...' : isFull ? 'CAPACITY FULL' : 'CHOOSE AS MENTOR'}
                     </button>
                  </div>
                )
              })}
           </div>
        </div>
      )}
    </div>
  )
}
