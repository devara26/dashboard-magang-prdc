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

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: studentData, error: studentError } = await supabase
        .from('profiles')
        .select('id, dosen_id, enrollment_date')
        .eq('id', user.id)
        .single()

      if (studentError) throw studentError
      setProfile(studentData)

      if (studentData?.dosen_id) {
        const [dosenRes, countRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, nama_lengkap, nip, department, faculty, max_mahasiswa')
            .eq('id', studentData.dosen_id)
            .single(),
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('dosen_id', studentData.dosen_id)
            .eq('role', 'mahasiswa')
        ])
        
        if (dosenRes.data) {
          setCurrentDosen({ 
            ...dosenRes.data, 
            enrolled_count: countRes.count || 0 
          })
        }
      } else {
        const { data: allDosen } = await supabase
          .from('profiles')
          .select('id, nama_lengkap, nip, department, faculty, max_mahasiswa')
          .eq('role', 'dosen')
        
        const { data: allStudents } = await supabase
          .from('profiles')
          .select('dosen_id')
          .eq('role', 'mahasiswa')
          .not('dosen_id', 'is', null)

        const dosenCounts = (allStudents || []).reduce((acc, curr) => {
          if (curr.dosen_id) acc[curr.dosen_id] = (acc[curr.dosen_id] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        const dosenList = (allDosen || []).map(d => ({
          ...d,
          max_mahasiswa: d.max_mahasiswa || 10,
          enrolled_count: dosenCounts[d.id] || 0
        }))

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
      const { error } = await supabase
        .from('profiles')
        .update({ dosen_id: dosenId, enrollment_date: now })
        .eq('id', profile?.id)

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
      const { error } = await supabase
        .from('profiles')
        .update({ dosen_id: null, enrollment_date: null })
        .eq('id', profile?.id)

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
    <div className="animate-fade-in space-y-10">
      {/* Header */}
      <header>
        <h1 className="text-[32px] leading-[40px] font-bold tracking-tight text-[var(--on-surface)]">Dosen Pembimbing</h1>
        <p className="text-[14px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest mt-1">Pembimbing Akademik Magang</p>
      </header>

      {currentDosen ? (
        <section className="bg-[var(--surface-container-lowest)] rounded-[48px] border border-[var(--outline-variant)] p-12 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 px-8 py-3 bg-[#e6f4ea] text-[#137333] rounded-bl-[32px] border-b border-l border-[#CEEAD6] text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] fill-icon">verified</span>
            Terdaftar
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-12">
            <div className="w-40 h-40 rounded-[40px] bg-[var(--primary)] flex-shrink-0 flex items-center justify-center shadow-xl shadow-blue-100 border-4 border-white overflow-hidden relative group">
              <span className="text-6xl font-black text-white group-hover:scale-110 transition-transform">
                {currentDosen.nama_lengkap.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex-1 text-center md:text-left space-y-8">
              <div>
                <h2 className="text-[32px] font-black text-[var(--on-surface)] leading-tight">{currentDosen.nama_lengkap}</h2>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start mt-3">
                  <span className="px-4 py-1.5 bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">badge</span>
                    NIP: {currentDosen.nip || '-'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest">Fakultas</p>
                  <p className="text-[16px] font-bold text-[var(--on-surface)]">{currentDosen.faculty || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest">Departemen</p>
                  <p className="text-[16px] font-bold text-[var(--on-surface)]">{currentDosen.department || '-'}</p>
                </div>
                {profile?.enrollment_date && (
                  <div className="md:col-span-2 space-y-1">
                    <p className="text-[10px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest">Waktu Pendaftaran</p>
                    <p className="text-[16px] font-bold text-[var(--on-surface)]">
                      {new Date(profile.enrollment_date).toLocaleDateString('id-ID', {
                        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-[var(--outline-variant)]/30">
                <button
                  onClick={handleUnenroll}
                  disabled={unloading}
                  className="px-8 py-4 bg-[var(--error-container)] text-[var(--error)] rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[var(--error)] hover:text-white transition-all flex items-center gap-3 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">person_remove</span>
                  {unloading ? 'MEMBATALKAN...' : 'BATALKAN PENDAFTARAN'}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="space-y-10">
          <section className="bg-[var(--primary-container)] p-8 rounded-[32px] flex items-start gap-6 border border-[var(--primary)]/10">
            <span className="material-symbols-outlined text-[36px] text-[var(--on-primary-container)]">info</span>
            <div>
              <h4 className="text-[18px] font-black text-[var(--on-primary-container)] mb-1">Pilih Pembimbing</h4>
              <p className="text-[14px] font-medium text-[var(--on-primary-container)] opacity-80 leading-relaxed">
                Anda belum terdaftar pada dosen pembimbing manapun. Silakan pilih dari daftar dosen yang tersedia di bawah ini untuk memulai pemantauan progres magang.
              </p>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {availableDosen.map(dosen => {
              const remaining = dosen.max_mahasiswa - dosen.enrolled_count
              const isFull = remaining <= 0

              return (
                <div key={dosen.id} className="bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-[40px] p-8 hover:border-[var(--primary)] hover:shadow-xl transition-all group flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-16 h-16 rounded-[24px] bg-[var(--surface-container-low)] flex items-center justify-center group-hover:bg-[var(--primary-container)] transition-all">
                        <span className="material-symbols-outlined text-[32px] text-[var(--outline)] group-hover:text-[var(--primary)]">person</span>
                      </div>
                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isFull ? 'bg-[var(--error-container)] text-[var(--error)]' : 'bg-[var(--secondary-container)] text-[var(--on-secondary-container)]'}`}>
                        {isFull ? 'Penuh' : `${remaining} Slot`}
                      </div>
                    </div>
                    <h3 className="text-[20px] font-black text-[var(--on-surface)] mb-1 group-hover:text-[var(--primary)] transition-colors">{dosen.nama_lengkap}</h3>
                    <p className="text-[12px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest mb-6">NIP: {dosen.nip || '-'}</p>
                    
                    <div className="space-y-4 mb-8">
                      <div>
                        <p className="text-[9px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest">Fakultas</p>
                        <p className="text-[14px] font-bold text-[var(--on-surface)]">{dosen.faculty || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-[var(--on-surface-variant)] uppercase tracking-widest">Prodi</p>
                        <p className="text-[14px] font-bold text-[var(--on-surface)]">{dosen.department || '-'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleEnroll(dosen.id, remaining)}
                    disabled={isFull || enrolling === dosen.id}
                    className="w-full py-5 rounded-[24px] text-[12px] font-black uppercase tracking-widest transition-all disabled:opacity-50 bg-[var(--surface-container-high)] hover:bg-[var(--primary)] hover:text-white text-[var(--on-surface)]"
                  >
                    {enrolling === dosen.id ? 'MENDAFTAR...' : isFull ? 'KAPASITAS PENUH' : 'DAFTAR PEMBIMBING'}
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
