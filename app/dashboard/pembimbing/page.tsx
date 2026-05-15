'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User, ShieldCheck, CheckCircle2, AlertCircle, X } from 'lucide-react'
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

      // Fetch student profile
      const { data: studentData, error: studentError } = await supabase
        .from('profiles')
        .select('id, dosen_id, enrollment_date')
        .eq('id', user.id)
        .single()

      if (studentError) throw studentError
      setProfile(studentData)

      if (studentData?.dosen_id) {
        // Fetch current dosen
        const { data: dosenData, error: dosenError } = await supabase
          .from('profiles')
          .select('id, nama_lengkap, nip, department, faculty, max_mahasiswa')
          .eq('id', studentData.dosen_id)
          .single()
        
        if (dosenError && dosenError.code !== 'PGRST116') throw dosenError
        if (dosenData) setCurrentDosen({ ...dosenData, enrolled_count: 0 })
      } else {
        // Fetch all dosen and their enrolled count
        const { data: allDosen, error: allDosenError } = await supabase
          .from('profiles')
          .select('id, nama_lengkap, nip, department, faculty, max_mahasiswa')
          .eq('role', 'dosen')
        
        if (allDosenError) throw allDosenError

        const { data: allStudents, error: studentsError } = await supabase
          .from('profiles')
          .select('dosen_id')
          .eq('role', 'mahasiswa')
          .not('dosen_id', 'is', null)

        if (studentsError) throw studentsError

        const dosenCounts = allStudents.reduce((acc, curr) => {
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
    if (availableSlots <= 0) {
      toast.error('Kapasitas dosen ini sudah penuh')
      return
    }

    if (!confirm('Apakah Anda yakin ingin mendaftar ke dosen ini?')) return

    setEnrolling(dosenId)
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('profiles')
        .update({ dosen_id: dosenId, enrollment_date: now })
        .eq('id', profile?.id)

      if (error) throw error
      toast.success('Berhasil mendaftar ke dosen pembimbing')
      fetchData()
    } catch (error: any) {
      toast.error('Gagal mendaftar: ' + error.message)
    } finally {
      setEnrolling(null)
    }
  }

  async function handleUnenroll() {
    if (!confirm('Apakah Anda yakin ingin membatalkan pendaftaran dosen pembimbing?')) return

    setUnloading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ dosen_id: null, enrollment_date: null })
        .eq('id', profile?.id)

      if (error) throw error
      toast.success('Berhasil membatalkan pendaftaran')
      setCurrentDosen(null)
      fetchData()
    } catch (error: any) {
      toast.error('Gagal membatalkan pendaftaran: ' + error.message)
    } finally {
      setUnloading(false)
    }
  }

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1A73E8] rounded-full animate-spin"></div>
        <p className="text-[#5F6368] text-sm font-medium animate-pulse">Memuat data pembimbing...</p>
      </div>
    </div>
  )

  return (
    <div className="pb-12 animate-[fade-in_0.7s_ease-out] max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#202124]">Dosen Pembimbing</h1>
        <p className="text-[#5F6368] text-sm mt-1">Kelola dan lihat informasi dosen pembimbing magang Anda.</p>
      </div>

      {currentDosen ? (
        <div className="bg-white border border-gray-200 rounded-3xl p-8 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 p-4 bg-[#E6F4EA] rounded-bl-3xl border-b border-l border-[#CEEAD6]">
            <p className="text-[#137333] text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" /> Terdaftar
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
            <div className="w-32 h-32 rounded-full bg-[#1A73E8] flex-shrink-0 flex items-center justify-center shadow-md border-4 border-white overflow-hidden">
              <span className="text-5xl font-bold text-white">
                {currentDosen.nama_lengkap.charAt(0).toUpperCase()}
              </span>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-[#202124] mb-2">{currentDosen.nama_lengkap}</h2>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                <span className="px-3 py-1 bg-gray-100 text-[#5F6368] rounded-full text-xs font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> NIP: {currentDosen.nip || '-'}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div>
                  <p className="text-xs text-[#5F6368] font-bold uppercase tracking-wider mb-1">Fakultas</p>
                  <p className="text-sm font-medium text-[#202124]">{currentDosen.faculty || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#5F6368] font-bold uppercase tracking-wider mb-1">Departemen / Prodi</p>
                  <p className="text-sm font-medium text-[#202124]">{currentDosen.department || '-'}</p>
                </div>
                {profile?.enrollment_date && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-[#5F6368] font-bold uppercase tracking-wider mb-1">Tanggal Terdaftar</p>
                    <p className="text-sm font-medium text-[#202124]">
                      {new Date(profile.enrollment_date).toLocaleDateString('id-ID', {
                        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-8 border-t border-gray-100 pt-6">
                <button
                  onClick={handleUnenroll}
                  disabled={unloading}
                  className="px-5 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-full text-sm font-medium transition-colors flex items-center gap-2 mx-auto md:mx-0 disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> 
                  {unloading ? 'Membatalkan...' : 'Batalkan Pendaftaran'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-[#E8F0FE] border border-[#D2E3FC] p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#1A73E8] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[#1A73E8] text-sm font-bold">Anda belum memilih dosen pembimbing</p>
              <p className="text-[#1A73E8]/80 text-xs mt-1">Silakan pilih salah satu dosen dari daftar di bawah ini untuk menjadi pembimbing magang Anda.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableDosen.map(dosen => {
              const remaining = dosen.max_mahasiswa - dosen.enrolled_count
              const isFull = remaining <= 0

              return (
                <div key={dosen.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-[#1A73E8] hover:shadow-md transition-all group flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-[#E8F0FE] transition-colors">
                        <User className="w-6 h-6 text-gray-500 group-hover:text-[#1A73E8]" />
                      </div>
                      <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isFull ? 'bg-[#FCE8E6] text-[#C5221F]' : 'bg-[#E6F4EA] text-[#137333]'}`}>
                        {isFull ? 'Penuh' : `${remaining} slot tersisa`}
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-[#202124] mb-1">{dosen.nama_lengkap}</h3>
                    <p className="text-xs text-[#5F6368] mb-3">NIP: {dosen.nip || '-'}</p>
                    <div className="text-xs text-[#5F6368] space-y-1 mb-4">
                      <p>Fakultas: <span className="font-medium text-[#202124]">{dosen.faculty || '-'}</span></p>
                      <p>Dept: <span className="font-medium text-[#202124]">{dosen.department || '-'}</span></p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleEnroll(dosen.id, remaining)}
                    disabled={isFull || enrolling === dosen.id}
                    className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[#F8F9FA] hover:bg-[#E8F0FE] text-[#1A73E8] border border-transparent hover:border-[#1A73E8]/30"
                  >
                    {enrolling === dosen.id ? 'Mendaftar...' : isFull ? 'Kapasitas Penuh' : 'Daftar ke Dosen Ini'}
                  </button>
                </div>
              )
            })}

            {availableDosen.length === 0 && (
              <div className="col-span-1 md:col-span-2 text-center py-12 bg-white rounded-2xl border border-gray-200">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-[#5F6368] text-sm font-medium">Belum ada data dosen yang terdaftar di sistem.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
