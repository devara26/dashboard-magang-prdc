'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, CheckCircle2, Clock, Activity, Calendar, FileText, Send, Award } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

type Profile = {
  id: string
  nama_lengkap: string
  nim: string
  prodi?: string
  instansi_magang: string
  unit_magang: string
  tanggal_mulai?: string
  tanggal_selesai?: string
}

type Kegiatan = {
  id: number
  tanggal: string
  kegiatan: string
  status: string
  komentar_dosen?: string
}

type Penilaian = {
  id?: string
  kedisiplinan: number
  kompetensi: number
  sikap: number
  laporan: number
}

export default function MahasiswaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const id = resolvedParams.id
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([])
  const [absensiStats, setAbsensiStats] = useState({ hadir: 0, izin: 0, sakit: 0, alpha: 0 })
  const [penilaian, setPenilaian] = useState<Penilaian>({ kedisiplinan: 0, kompetensi: 0, sikap: 0, laporan: 0 })
  const [loading, setLoading] = useState(true)
  const [submittingPenilaian, setSubmittingPenilaian] = useState(false)

  // State for comments
  const [komentar, setKomentar] = useState<Record<number, string>>({})
  const [submittingKomentar, setSubmittingKomentar] = useState<number | null>(null)

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
      
      if (profileError) throw profileError
      setProfile(profileData)

      // Fetch Absensi
      const { data: absensiData } = await supabase
        .from('absensi')
        .select('status')
        .eq('mahasiswa_id', id)

      if (absensiData) {
        const stats = { hadir: 0, izin: 0, sakit: 0, alpha: 0 }
        absensiData.forEach(a => {
          if (a.status === 'Hadir') stats.hadir++
          else if (a.status === 'Izin') stats.izin++
          else if (a.status === 'Sakit') stats.sakit++
          else stats.alpha++
        })
        setAbsensiStats(stats)
      }

      // Fetch Kegiatan
      if (profileData?.nim) {
        const { data: kegiatanData } = await supabase
          .from('Kegiatan')
          .select('*')
          .eq('nim', profileData.nim)
          .order('tanggal', { ascending: false })
        
        setKegiatan(kegiatanData || [])
        
        // Init komentar state
        const kom: Record<number, string> = {}
        kegiatanData?.forEach(k => {
          if (k.komentar_dosen) kom[k.id] = k.komentar_dosen
        })
        setKomentar(kom)
      }

      // Fetch Penilaian
      const { data: penilaianData } = await supabase
        .from('penilaian')
        .select('*')
        .eq('mahasiswa_id', id)
        .single()
      
      if (penilaianData) {
        setPenilaian({
          id: penilaianData.id,
          kedisiplinan: penilaianData.kedisiplinan || 0,
          kompetensi: penilaianData.kompetensi || 0,
          sikap: penilaianData.sikap || 0,
          laporan: penilaianData.laporan || 0
        })
      }

    } catch (error: any) {
      toast.error('Gagal memuat detail mahasiswa')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSimpanKomentar(kegiatanId: number) {
    try {
      setSubmittingKomentar(kegiatanId)
      const { error } = await supabase
        .from('Kegiatan')
        .update({ komentar_dosen: komentar[kegiatanId] })
        .eq('id', kegiatanId)

      if (error) throw error
      toast.success('Komentar berhasil disimpan')
    } catch (error: any) {
      toast.error('Gagal menyimpan komentar: ' + error.message)
    } finally {
      setSubmittingKomentar(null)
    }
  }

  async function handleSimpanPenilaian(e: React.FormEvent) {
    e.preventDefault()
    setSubmittingPenilaian(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Anda belum login')

      const payload = {
        mahasiswa_id: id,
        dosen_id: user.id,
        kedisiplinan: penilaian.kedisiplinan,
        kompetensi: penilaian.kompetensi,
        sikap: penilaian.sikap,
        laporan: penilaian.laporan,
      }

      if (penilaian.id) {
        const { error } = await supabase.from('penilaian').update(payload).eq('id', penilaian.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('penilaian').insert(payload).select().single()
        if (error) throw error
        if (data) setPenilaian(prev => ({ ...prev, id: data.id }))
      }

      toast.success('Penilaian berhasil disimpan')
    } catch (error: any) {
      toast.error('Gagal menyimpan penilaian: ' + error.message)
    } finally {
      setSubmittingPenilaian(false)
    }
  }

  function getWorkDays(startDateStr: string, endDateStr: string): number {
    const start = new Date(startDateStr)
    const end = new Date(endDateStr)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 150
    let count = 0
    let current = new Date(start)
    while (current <= end) {
      const day = current.getDay()
      if (day !== 0 && day !== 6) count++
      current.setDate(current.getDate() + 1)
    }
    return count
  }

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1A73E8] rounded-full animate-spin"></div>
        <p className="text-[#5F6368] text-sm font-medium animate-pulse">Memuat detail mahasiswa...</p>
      </div>
    </div>
  )

  const totalHariTarget = profile?.tanggal_mulai && profile?.tanggal_selesai 
    ? getWorkDays(profile.tanggal_mulai, profile.tanggal_selesai) 
    : 150
  
  const progressPersen = totalHariTarget > 0 ? Math.min(Math.round((absensiStats.hadir / totalHariTarget) * 100), 100) : 0

  return (
    <div className="pb-8 animate-[fade-in_0.7s_ease-out] max-w-lg mx-auto md:max-w-none">
      
      {/* Header */}
      <div className="mb-6">
        <Link href="/dosen" className="inline-flex items-center text-sm font-medium text-[#5F6368] hover:text-[#1A73E8] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Kembali ke Daftar
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#1A73E8] flex-shrink-0 flex items-center justify-center shadow-sm border-4 border-white">
            <span className="text-2xl font-bold text-white">{profile?.nama_lengkap?.charAt(0).toUpperCase() || 'M'}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#202124] leading-tight">{profile?.nama_lengkap}</h1>
            <p className="text-[#5F6368] text-sm mt-1">{profile?.nim} • {profile?.prodi}</p>
          </div>
        </div>
      </div>

      {/* Rekap Absensi */}
      <div className="bg-white rounded-[24px] p-6 mb-6 shadow-sm border border-gray-50">
        <h2 className="text-[#202124] text-base font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#1A73E8]" />
          Rekap Absensi
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#E6F4EA] rounded-2xl p-4 text-center">
            <p className="text-[#137333] text-2xl font-black">{absensiStats.hadir}</p>
            <p className="text-[#137333] text-xs font-bold uppercase mt-1">Hadir</p>
          </div>
          <div className="bg-[#FEF7E0] rounded-2xl p-4 text-center">
            <p className="text-[#E37400] text-2xl font-black">{absensiStats.izin}</p>
            <p className="text-[#E37400] text-xs font-bold uppercase mt-1">Izin</p>
          </div>
          <div className="bg-[#FCE8E6] rounded-2xl p-4 text-center">
            <p className="text-[#C5221F] text-2xl font-black">{absensiStats.sakit}</p>
            <p className="text-[#C5221F] text-xs font-bold uppercase mt-1">Sakit</p>
          </div>
          <div className="bg-[#E8F0FE] rounded-2xl p-4 text-center relative overflow-hidden">
            <p className="text-[#1A73E8] text-2xl font-black z-10 relative">{progressPersen}%</p>
            <p className="text-[#1A73E8] text-xs font-bold uppercase mt-1 z-10 relative">Persentase</p>
          </div>
        </div>
      </div>

      {/* Form Penilaian */}
      <div className="bg-white rounded-[24px] p-6 mb-6 shadow-sm border border-gray-50">
        <h2 className="text-[#202124] text-base font-bold mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-[#FBBC04]" />
          Penilaian Akhir (0-100)
        </h2>
        <form onSubmit={handleSimpanPenilaian}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-[#5F6368] mb-1.5 uppercase">Kedisiplinan</label>
              <input
                type="number" min="0" max="100" required
                value={penilaian.kedisiplinan || ''}
                onChange={e => setPenilaian({...penilaian, kedisiplinan: Number(e.target.value)})}
                className="w-full bg-[#F8F9FA] text-[#202124] rounded-xl px-4 py-2.5 text-sm border-transparent focus:bg-white focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5F6368] mb-1.5 uppercase">Kompetensi</label>
              <input
                type="number" min="0" max="100" required
                value={penilaian.kompetensi || ''}
                onChange={e => setPenilaian({...penilaian, kompetensi: Number(e.target.value)})}
                className="w-full bg-[#F8F9FA] text-[#202124] rounded-xl px-4 py-2.5 text-sm border-transparent focus:bg-white focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5F6368] mb-1.5 uppercase">Sikap/Etika</label>
              <input
                type="number" min="0" max="100" required
                value={penilaian.sikap || ''}
                onChange={e => setPenilaian({...penilaian, sikap: Number(e.target.value)})}
                className="w-full bg-[#F8F9FA] text-[#202124] rounded-xl px-4 py-2.5 text-sm border-transparent focus:bg-white focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5F6368] mb-1.5 uppercase">Laporan</label>
              <input
                type="number" min="0" max="100" required
                value={penilaian.laporan || ''}
                onChange={e => setPenilaian({...penilaian, laporan: Number(e.target.value)})}
                className="w-full bg-[#F8F9FA] text-[#202124] rounded-xl px-4 py-2.5 text-sm border-transparent focus:bg-white focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-all font-medium"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingPenilaian}
              className="bg-[#1A73E8] hover:bg-[#1967D2] text-white rounded-xl px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {submittingPenilaian ? 'Menyimpan...' : 'Simpan Penilaian'}
            </button>
          </div>
        </form>
      </div>

      {/* Log Kegiatan */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-50 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 bg-white">
          <h2 className="text-[#202124] text-base font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#34A853]" />
            Jurnal Kegiatan
          </h2>
        </div>
        
        {kegiatan.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[#5F6368] text-sm">Belum ada kegiatan yang dilaporkan.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {kegiatan.map((k) => (
              <div key={k.id} className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.status === 'Selesai' ? 'bg-[#E6F4EA] text-[#137333]' : 'bg-[#FEF7E0] text-[#E37400]'}`}>
                    {k.status === 'Selesai' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-[#1A73E8] mb-1">{k.tanggal}</p>
                    <p className="text-sm font-bold text-[#202124] leading-relaxed">{k.kegiatan}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600">
                      Status: {k.status}
                    </span>
                  </div>
                </div>

                {/* Form Komentar */}
                <div className="ml-14 bg-[#F8F9FA] p-3 rounded-xl border border-gray-100">
                  <label className="block text-[10px] font-bold text-[#5F6368] mb-2 uppercase">Komentar Pembimbing</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Tambahkan catatan untuk kegiatan ini..."
                      value={komentar[k.id] || ''}
                      onChange={e => setKomentar({...komentar, [k.id]: e.target.value})}
                      className="flex-1 bg-white border-transparent rounded-lg px-3 py-2 text-sm focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-all"
                    />
                    <button
                      onClick={() => handleSimpanKomentar(k.id)}
                      disabled={submittingKomentar === k.id}
                      className="bg-white border border-gray-200 text-[#1A73E8] hover:bg-[#E8F0FE] rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center"
                    >
                      {submittingKomentar === k.id ? '...' : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
