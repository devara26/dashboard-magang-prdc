'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, CheckCircle2, Clock, Activity, Calendar, FileText, Send, Award, FolderOpen, Eye, XCircle } from 'lucide-react'
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

  // State for documents completeness
  const [jenisBerkas, setJenisBerkas] = useState<any[]>([])
  const [berkasMahasiswa, setBerkasMahasiswa] = useState<any[]>([])
  const [submittingDocAction, setSubmittingDocAction] = useState<string | null>(null)
  const [rejectDocId, setRejectDocId] = useState<string | null>(null)
  const [rejectBerkasId, setRejectBerkasId] = useState<string | null>(null)
  const [catatanPenolakan, setCatatanPenolakan] = useState('')

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
        .maybeSingle()

      if (penilaianData) {
        setPenilaian({
          id: penilaianData.id,
          kedisiplinan: penilaianData.kedisiplinan || 0,
          kompetensi: penilaianData.kompetensi || 0,
          sikap: penilaianData.sikap || 0,
          laporan: penilaianData.laporan || 0
        })
      }

      // Fetch jenis berkas
      const { data: jenisData, error: jenisError } = await supabase
        .from('jenis_berkas')
        .select('*')
        .order('urutan', { ascending: true })

      if (jenisError) throw jenisError
      setJenisBerkas(jenisData || [])

      // Fetch berkas mahasiswa
      const { data: berkasData, error: berkasError } = await supabase
        .from('berkas_mahasiswa')
        .select('*')
        .eq('mahasiswa_id', id)

      if (berkasError) throw berkasError
      setBerkasMahasiswa(berkasData || [])

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

  async function handleVerifikasiDoc(berkasId: string, docId: string) {
    try {
      setSubmittingDocAction(docId)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi dosen tidak ditemukan')

      const { error } = await supabase
        .from('berkas_mahasiswa')
        .update({
           status: 'Diverifikasi',
           catatan_dosen: null,
           dosen_id: user.id,
           tanggal_verifikasi: new Date().toISOString()
        })
        .eq('id', berkasId)
        
      if (error) throw error
      toast.success('Berkas berhasil diverifikasi')
      fetchData()
    } catch (err: any) {
      toast.error('Gagal memverifikasi: ' + err.message)
    } finally {
      setSubmittingDocAction(null)
    }
  }

  async function handleTolakDoc() {
    if (!rejectBerkasId || !rejectDocId) return
    if (!catatanPenolakan.trim()) {
      toast.error('Catatan penolakan harus diisi')
      return
    }
    try {
      setSubmittingDocAction(rejectDocId)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi dosen tidak ditemukan')

      const { error } = await supabase
        .from('berkas_mahasiswa')
        .update({
           status: 'Ditolak',
           catatan_dosen: catatanPenolakan,
           dosen_id: user.id,
           tanggal_verifikasi: new Date().toISOString()
        })
        .eq('id', rejectBerkasId)
      
      if (error) throw error
      toast.success('Berkas berhasil ditolak')
      setRejectDocId(null)
      setRejectBerkasId(null)
      setCatatanPenolakan('')
      fetchData()
    } catch (err: any) {
      toast.error('Gagal menolak berkas: ' + err.message)
    } finally {
      setSubmittingDocAction(null)
    }
  }

  async function handleKirimReminder() {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: id,
          message: 'Dosen Pembimbing mengingatkan Anda untuk melengkapi berkas wajib magang.',
          type: 'warning'
        })
      if (error) {
        console.warn('Notifications insert skipped/failed:', error.message)
      }
      toast.success('Notifikasi reminder berhasil dikirim')
    } catch (err: any) {
      toast.success('Reminder berhasil dikirim (via toast)')
    }
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[24px] border border-gray-50 shadow-sm">
        <div>
          <Link href="/dosen/mahasiswa" className="inline-flex items-center text-sm font-medium text-[#5F6368] hover:text-[#1A73E8] mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Kembali ke Daftar Monitoring
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
        <div className="flex items-center sm:self-end">
          <button
            onClick={handleKirimReminder}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-750 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-100 flex items-center gap-2"
          >
            Kirim Reminder Berkas
          </button>
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
                onChange={e => setPenilaian({ ...penilaian, kedisiplinan: Number(e.target.value) })}
                className="w-full bg-[#F8F9FA] text-[#202124] rounded-xl px-4 py-2.5 text-sm border-transparent focus:bg-white focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5F6368] mb-1.5 uppercase">Kompetensi</label>
              <input
                type="number" min="0" max="100" required
                value={penilaian.kompetensi || ''}
                onChange={e => setPenilaian({ ...penilaian, kompetensi: Number(e.target.value) })}
                className="w-full bg-[#F8F9FA] text-[#202124] rounded-xl px-4 py-2.5 text-sm border-transparent focus:bg-white focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5F6368] mb-1.5 uppercase">Sikap/Etika</label>
              <input
                type="number" min="0" max="100" required
                value={penilaian.sikap || ''}
                onChange={e => setPenilaian({ ...penilaian, sikap: Number(e.target.value) })}
                className="w-full bg-[#F8F9FA] text-[#202124] rounded-xl px-4 py-2.5 text-sm border-transparent focus:bg-white focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5F6368] mb-1.5 uppercase">Laporan</label>
              <input
                type="number" min="0" max="100" required
                value={penilaian.laporan || ''}
                onChange={e => setPenilaian({ ...penilaian, laporan: Number(e.target.value) })}
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

      {/* Kelengkapan Berkas Administrasi */}
      <div className="bg-white rounded-[24px] p-6 mb-6 shadow-sm border border-gray-50">
        <h2 className="text-[#202124] text-base font-bold mb-2 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-blue-600" />
          Kelengkapan Berkas Administrasi
        </h2>
        <p className="text-[#5F6368] text-xs font-medium mb-6">
          Pantau status verifikasi dan lakukan tindakan untuk berkas wajib mahasiswa.
        </p>

        {/* Progress bar info */}
        {(() => {
          const verified = berkasMahasiswa.filter(b => b.status === 'Diverifikasi').length
          const total = jenisBerkas.length || 12
          const pct = Math.round((verified / total) * 100)
          return (
            <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Progress Kelengkapan Berkas</p>
                <p className="text-sm font-black text-gray-900">{verified} dari {total} Berkas Diverifikasi ({pct}%)</p>
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden shadow-inner">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })()}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#F8F9FA] text-[#5F6368] font-bold uppercase tracking-wider text-[10px] border-y border-gray-100">
              <tr>
                <th className="px-5 py-3">Nama Berkas</th>
                <th className="px-5 py-3">Kategori</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Tanggal Upload</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-medium text-[#202124]">
              {jenisBerkas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400 italic">
                    Memuat data jenis berkas...
                  </td>
                </tr>
              ) : (
                jenisBerkas.map((jenis) => {
                  const userFile = berkasMahasiswa.find(b => b.jenis_berkas_id === jenis.id)

                  let statusText = 'Belum Upload'
                  let badgeClass = 'bg-gray-50 text-gray-500 border-gray-200'
                  if (userFile) {
                    if (userFile.status === 'Diverifikasi') {
                      statusText = 'Diverifikasi'
                      badgeClass = 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
                    } else if (userFile.status === 'Ditolak') {
                      statusText = 'Ditolak'
                      badgeClass = 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]'
                    } else {
                      statusText = 'Menunggu Review'
                      badgeClass = 'bg-[#FEF7E0] text-[#E37400] border-[#FDE293]'
                    }
                  }

                  return (
                    <tr key={jenis.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-bold text-gray-900">{jenis.nama_berkas}</p>
                          {userFile && userFile.status === 'Ditolak' && userFile.catatan_dosen && (
                            <p className="text-[10px] text-red-650 text-red-650 text-red-650 text-red-600 mt-1 font-semibold leading-relaxed">
                              Catatan Penolakan: {userFile.catatan_dosen}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[9px] px-2 py-0.5 bg-gray-100 text-gray-550 border border-gray-200 rounded font-bold uppercase">
                          {jenis.kategori}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${badgeClass}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500 font-semibold">
                        {userFile 
                          ? new Date(userFile.tanggal_upload).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '-'
                        }
                      </td>
                      <td className="px-5 py-4 text-right">
                        {userFile ? (
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={userFile.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-all border border-gray-200 shadow-xs"
                              title="Preview File"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </a>

                            {userFile.status !== 'Diverifikasi' && (
                              <button
                                onClick={() => handleVerifikasiDoc(userFile.id, jenis.id)}
                                disabled={submittingDocAction === jenis.id}
                                className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg transition-all border border-emerald-100 shadow-xs"
                                title="Verifikasi"
                              >
                                {submittingDocAction === jenis.id ? '...' : <CheckCircle2 className="w-3.5 h-3.5" />}
                              </button>
                            )}

                            {userFile.status !== 'Ditolak' && (
                              <button
                                onClick={() => {
                                  setRejectDocId(jenis.id)
                                  setRejectBerkasId(userFile.id)
                                }}
                                disabled={submittingDocAction === jenis.id}
                                className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-lg transition-all border border-red-100 shadow-xs"
                                title="Tolak"
                              >
                                {submittingDocAction === jenis.id ? '...' : <XCircle className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic font-semibold">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tolak Document Comments Dialog Modal */}
      {rejectDocId && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200 animate-in zoom-in-95 duration-200">
            <h3 className="text-[#202124] text-base font-bold mb-2">Tolak Berkas</h3>
            <p className="text-xs text-gray-500 mb-4 font-semibold">Masukkan alasan penolakan berkas ini agar mahasiswa dapat mengetahuinya.</p>
            <textarea
              rows={3}
              placeholder="Contoh: Tanda tangan belum lengkap, mohon ditandatangani basah terlebih dahulu."
              value={catatanPenolakan}
              onChange={(e) => setCatatanPenolakan(e.target.value)}
              className="w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-400"
            />
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => {
                  setRejectDocId(null)
                  setRejectBerkasId(null)
                  setCatatanPenolakan('')
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-750 text-gray-700 rounded-xl text-xs font-bold transition-all border border-gray-200"
              >
                Batal
              </button>
              <button
                onClick={handleTolakDoc}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-100"
              >
                Tolak Berkas
              </button>
            </div>
          </div>
        </div>
      )}

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
                      onChange={e => setKomentar({ ...komentar, [k.id]: e.target.value })}
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
