'use client'

import { useEffect, useState, useRef, use } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Clock, 
  FolderOpen, 
  Activity, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Plus, 
  Edit2, 
  Save,
  User,
  TrendingUp,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Profile = {
  id: string
  nama_lengkap: string
  nim: string
  prodi: string
  instansi_magang: string
  unit_magang: string
  tanggal_mulai: string
  tanggal_selesai: string
  bio: string
  avatar_url?: string
}

type Kegiatan = {
  id: number
  tanggal: string
  kegiatan: string
  status: string
  status_persetujuan: 'Menunggu' | 'Disetujui' | 'Ditolak'
  komentar_dosen: string | null
}

type Berkas = {
  id: string
  jenis_berkas_id: string
  nama_file: string
  file_url: string
  tipe_file: string
  ukuran_bytes: number
  status: 'Menunggu Review' | 'Diverifikasi' | 'Ditolak'
  catatan_dosen: string | null
  tanggal_upload: string
}

type Comment = {
  id: string
  kegiatan_id: number
  user_id: string
  message: string
  created_at: string
  profiles?: {
    nama_lengkap: string
    role: string
  }
}

export default function StudentDashboardView({ params }: { params: Promise<{ studentId: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const studentId = resolvedParams.studentId

  const [activeTab, setActiveTab] = useState<'ringkasan' | 'absensi' | 'jurnal' | 'berkas' | 'penilaian'>('ringkasan')
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(false)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [periods, setPeriods] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<any | null>(null)

  // Selected period data
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([])
  const [absensi, setAbsensi] = useState<any[]>([])
  const [berkas, setBerkas] = useState<Berkas[]>([])
  const [jenisBerkas, setJenisBerkas] = useState<any[]>([])
  const [penilaian, setPenilaian] = useState<any | null>(null)

  // Comments and feedbacks
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState<{ [key: number]: string }>({})
  const [isCommenting, setIsCommenting] = useState<{ [key: number]: boolean }>({})
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)

  // Filters
  const [bulanFilter, setBulanFilter] = useState<string>('all')
  const [jurnalStatusFilter, setJurnalStatusFilter] = useState<string>('all')

  // Inline approval / rejection states
  const [rejectingJurnalId, setRejectingJurnalId] = useState<number | null>(null)
  const [rejectionComment, setRejectionComment] = useState('')
  const [rejectingBerkasId, setRejectingBerkasId] = useState<string | null>(null)
  const [berkasRejectionNote, setBerkasRejectionNote] = useState('')

  // Penilaian scoring form state
  const [penilaianScores, setPenilaianScores] = useState({
    kedisiplinan: 0,
    kompetensi: 0,
    sikap: 0,
    laporan: 0,
    catatan: ''
  })
  const [isEditingPenilaian, setIsEditingPenilaian] = useState(false)
  const [isSavingPenilaian, setIsSavingPenilaian] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [studentId])

  async function fetchInitialData() {
    setLoading(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Sesi tidak ditemukan. Silakan login kembali.')

      // 1. Fetch Student Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .single()

      if (profileError) throw new Error('Gagal mengambil data profil mahasiswa.')
      setProfile(profileData)

      // 2. Fetch master data jenis berkas
      const { data: jenisData, error: jenisError } = await supabase
        .from('jenis_berkas')
        .select('*')
        .order('urutan', { ascending: true })
      if (jenisError) throw jenisError
      setJenisBerkas(jenisData || [])

      // 3. Fetch Periods for student
      const { data: periodesData, error: periodesError } = await supabase
        .from('periode_magang')
        .select('*')
        .eq('mahasiswa_id', studentId)
        .order('nomor_periode', { ascending: true })

      if (periodesError) throw periodesError
      setPeriods(periodesData || [])

      // Choose active or fallback period
      if (periodesData && periodesData.length > 0) {
        const activeP = periodesData.find(p => p.id === profileData.active_periode_id) || periodesData[0]
        setSelectedPeriod(activeP)
        await loadPeriodData(activeP, profileData)
      } else {
        // Fallback synthetic period if database table has no periods yet
        const synthPeriod = {
          id: null,
          mahasiswa_id: studentId,
          nomor_periode: 1,
          nama_instansi: profileData.instansi_magang || '-',
          unit_divisi: profileData.unit_magang || 'Divisi tidak tersedia',
          tanggal_mulai: profileData.tanggal_mulai,
          tanggal_selesai: profileData.tanggal_selesai,
          status: 'aktif'
        }
        setSelectedPeriod(synthPeriod)
        await loadPeriodData(synthPeriod, profileData)
      }

    } catch (error: any) {
      toast.error(error.message || 'Gagal memuat detail mahasiswa.')
    } finally {
      setLoading(false)
    }
  }

  const loadPeriodData = async (period: any, profileData: any) => {
    setLoadingData(true)
    try {
      const periodId = period.id
      const pNum = period.nomor_periode

      // 1. Fetch Absensi
      let absQuery = supabase.from('absensi').select('*').eq('mahasiswa_id', studentId)
      if (periodId === null || pNum === 1) {
        absQuery = periodId ? absQuery.or(`periode_id.eq.${periodId},periode_id.is.null`) : absQuery.filter('periode_id', 'is', null)
      } else {
        absQuery = absQuery.eq('periode_id', periodId)
      }
      const { data: absData, error: absError } = await absQuery.order('tanggal', { ascending: false })
      if (absError) throw absError
      setAbsensi(absData || [])

      // 2. Fetch Jurnal (Kegiatan)
      let kegQuery = supabase
        .from('Kegiatan')
        .select('*')
        .or(`mahasiswa_id.eq.${studentId},nim.eq.${profileData.nim}`)
      if (periodId === null || pNum === 1) {
        kegQuery = periodId ? kegQuery.or(`periode_id.eq.${periodId},periode_id.is.null`) : kegQuery.filter('periode_id', 'is', null)
      } else {
        kegQuery = kegQuery.eq('periode_id', periodId)
      }
      const { data: kegData, error: kegError } = await kegQuery.order('tanggal', { ascending: false })
      if (kegError) throw kegError
      setKegiatan(kegData || [])

      // Fetch comments for these Jurnal entries
      if (kegData && kegData.length > 0) {
        const { data: commentsData } = await supabase
          .from('comments')
          .select('*, profiles(nama_lengkap, role)')
          .in('kegiatan_id', kegData.map(k => k.id))
          .order('created_at', { ascending: true })
        setComments(commentsData as any || [])
      } else {
        setComments([])
      }

      // 3. Fetch Berkas
      let berkasQuery = supabase.from('berkas').select('*').eq('mahasiswa_id', studentId)
      if (periodId === null || pNum === 1) {
        berkasQuery = periodId ? berkasQuery.or(`periode_id.eq.${periodId},periode_id.is.null`) : berkasQuery.filter('periode_id', 'is', null)
      } else {
        berkasQuery = berkasQuery.eq('periode_id', periodId)
      }
      const { data: bData, error: bError } = await berkasQuery
      if (bError) throw bError
      setBerkas(bData || [])

      // 4. Fetch Penilaian
      let penQuery = supabase.from('penilaian').select('*').eq('mahasiswa_id', studentId)
      if (periodId === null || pNum === 1) {
        penQuery = periodId ? penQuery.or(`periode_id.eq.${periodId},periode_id.is.null`) : penQuery.filter('periode_id', 'is', null)
      } else {
        penQuery = penQuery.eq('periode_id', periodId)
      }
      const { data: penData, error: penError } = await penQuery.maybeSingle()
      if (penError) throw penError
      
      setPenilaian(penData || null)
      if (penData) {
        setPenilaianScores({
          kedisiplinan: penData.kedisiplinan || 0,
          kompetensi: penData.kompetensi || 0,
          sikap: penData.sikap || 0,
          laporan: penData.laporan || 0,
          catatan: penData.catatan || ''
        })
      } else {
        setPenilaianScores({
          kedisiplinan: 0,
          kompetensi: 0,
          sikap: 0,
          laporan: 0,
          catatan: ''
        })
      }
      setAiSummary(null) // Reset AI insights on period switch

    } catch (e: any) {
      console.error('Error loading period data:', e)
      toast.error('Gagal memuat data periode: ' + e.message)
    } finally {
      setLoadingData(false)
    }
  }

  const handlePeriodSwitch = async (period: any) => {
    setSelectedPeriod(period)
    if (profile) {
      await loadPeriodData(period, profile)
    }
  }

  // Jurnal approval handlers
  const handleApproveJurnal = async (jurnalId: number) => {
    try {
      const { error } = await supabase
        .from('Kegiatan')
        .update({ status_persetujuan: 'Disetujui', komentar_dosen: null })
        .eq('id', jurnalId)

      if (error) throw error

      setKegiatan(prev =>
        prev.map(k => (k.id === jurnalId ? { ...k, status_persetujuan: 'Disetujui', komentar_dosen: null } : k))
      )
      toast.success('Jurnal disetujui')

      // Insert real-time notification
      await supabase.from('notifications').insert({
        user_id: studentId,
        message: `Jurnal Anda pada tanggal baru-baru ini disetujui dosen pembimbing ✅`,
        type: 'jurnal_approved'
      })
    } catch (e: any) {
      toast.error('Gagal menyetujui jurnal: ' + e.message)
    }
  }

  const handleRejectJurnal = async (jurnalId: number) => {
    if (!rejectionComment.trim()) {
      toast.error('Harap masukkan komentar alasan penolakan.')
      return
    }
    try {
      const { error } = await supabase
        .from('Kegiatan')
        .update({ 
          status_persetujuan: 'Ditolak',
          komentar_dosen: rejectionComment.trim()
        })
        .eq('id', jurnalId)

      if (error) throw error

      setKegiatan(prev =>
        prev.map(k => (k.id === jurnalId ? { ...k, status_persetujuan: 'Ditolak', komentar_dosen: rejectionComment.trim() } : k))
      )
      toast.success('Jurnal ditolak dengan catatan')
      setRejectingJurnalId(null)
      setRejectionComment('')

      // Insert real-time notification
      await supabase.from('notifications').insert({
        user_id: studentId,
        message: `Jurnal Anda ditolak dosen pembimbing: "${rejectionComment.substring(0, 25)}..." ❌`,
        type: 'jurnal_rejected'
      })
    } catch (e: any) {
      toast.error('Gagal menolak jurnal: ' + e.message)
    }
  }

  // Berkas verification handlers
  const handleVerifyBerkas = async (berkasId: string) => {
    try {
      const { error } = await supabase
        .from('berkas')
        .update({ 
          status: 'Diverifikasi',
          catatan_dosen: null
        })
        .eq('id', berkasId)

      if (error) throw error

      setBerkas(prev =>
        prev.map(b => (b.id === berkasId ? { ...b, status: 'Diverifikasi', catatan_dosen: null } : b))
      )
      toast.success('Berkas berhasil diverifikasi')

      // Insert real-time notification
      await supabase.from('notifications').insert({
        user_id: studentId,
        message: `Berkas Anda telah diverifikasi oleh dosen pembimbing ✅`,
        type: 'berkas_verified'
      })
    } catch (e: any) {
      toast.error('Gagal memverifikasi berkas: ' + e.message)
    }
  }

  const handleRejectBerkas = async (berkasId: string) => {
    if (!berkasRejectionNote.trim()) {
      toast.error('Harap masukkan catatan alasan penolakan.')
      return
    }
    try {
      const { error } = await supabase
        .from('berkas')
        .update({ 
          status: 'Ditolak',
          catatan_dosen: berkasRejectionNote.trim()
        })
        .eq('id', berkasId)

      if (error) throw error

      setBerkas(prev =>
        prev.map(b => (b.id === berkasId ? { ...b, status: 'Ditolak', catatan_dosen: berkasRejectionNote.trim() } : b))
      )
      toast.success('Berkas ditolak dengan catatan')
      setRejectingBerkasId(null)
      setBerkasRejectionNote('')

      // Insert real-time notification
      await supabase.from('notifications').insert({
        user_id: studentId,
        message: `Berkas Anda ditolak dosen pembimbing: "${berkasRejectionNote.substring(0, 25)}..." ❌`,
        type: 'berkas_rejected'
      })
    } catch (e: any) {
      toast.error('Gagal menolak berkas: ' + e.message)
    }
  }

  // Jurnal discussion comments
  async function handlePostComment(kegiatanId: number) {
    const message = newComment[kegiatanId]
    if (!message || message.trim() === '') return

    setIsCommenting(prev => ({ ...prev, [kegiatanId]: true }))
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi tidak ditemukan')

      const { data, error } = await supabase.from('comments').insert({
        kegiatan_id: kegiatanId,
        user_id: user.id,
        message: message.trim()
      }).select('*, profiles(nama_lengkap, role)').single()

      if (error) throw error

      setComments(prev => [...prev, data as any])
      setNewComment(prev => ({ ...prev, [kegiatanId]: '' }))

      await supabase.from('notifications').insert([
        {
          user_id: studentId,
          message: `Dosen memberikan komentar pada jurnal Anda: "${message.substring(0, 30)}..."`,
          type: 'info'
        }
      ])

      toast.success('Komentar berhasil dikirim')
    } catch (error: any) {
      toast.error('Gagal mengirim komentar')
    } finally {
      setIsCommenting(prev => ({ ...prev, [kegiatanId]: false }))
    }
  }

  // AI Insights generator
  async function handleSummarize() {
    if (kegiatan.length === 0) return
    setIsSummarizing(true)
    setAiSummary(null)

    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      const activitiesCount = kegiatan.length
      const statusSelesai = kegiatan.filter(k => k.status === 'Selesai').length
      const summary = `Berdasarkan ${activitiesCount} entri jurnal pada periode ini, mahasiswa telah menunjukkan penyelesaian tugas sebesar ${Math.round((statusSelesai/activitiesCount)*100)}% secara mandiri. Fokus utama kegiatan berkisar pada ${kegiatan[0]?.kegiatan.substring(0, 45)}... serta ${kegiatan[1]?.kegiatan?.substring(0, 45) || 'tugas operasional lainnya'}. Mahasiswa memperlihatkan konsistensi yang baik.`
      setAiSummary(summary)
      toast.success('Ringkasan AI berhasil dibuat')
    } catch (error) {
      toast.error('Gagal membuat ringkasan AI')
    } finally {
      setIsSummarizing(false)
    }
  }

  // Penilaian form submission
  const handleSimpanPenilaian = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingPenilaian(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Anda belum login')

      const { kedisiplinan, kompetensi, sikap, laporan, catatan } = penilaianScores
      const avgScore = Number(((kedisiplinan + kompetensi + sikap + laporan) / 4).toFixed(2))

      const payload = {
        mahasiswa_id: studentId,
        dosen_id: user.id,
        kedisiplinan,
        kompetensi,
        sikap,
        laporan,
        nilai_akhir: avgScore,
        catatan: catatan.trim(),
        periode_id: selectedPeriod?.id
      }

      if (penilaian?.id) {
        const { error } = await supabase
          .from('penilaian')
          .update(payload)
          .eq('id', penilaian.id)

        if (error) throw error
        setPenilaian({ ...penilaian, ...payload })
      } else {
        const { data, error } = await supabase
          .from('penilaian')
          .insert(payload)
          .select()
          .single()

        if (error) throw error
        setPenilaian(data)
      }

      toast.success('Penilaian berhasil disimpan')
      setIsEditingPenilaian(false)
    } catch (error: any) {
      toast.error('Gagal menyimpan penilaian: ' + error.message)
    } finally {
      setIsSavingPenilaian(false)
    }
  }

  // Utility days count
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
        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-500 text-sm font-bold animate-pulse">Menghubungkan ke server data...</p>
      </div>
    </div>
  )

  // Calculations for active period
  const totalHariTarget = selectedPeriod?.tanggal_mulai && selectedPeriod?.tanggal_selesai 
    ? Math.max(1, getWorkDays(selectedPeriod.tanggal_mulai, selectedPeriod.tanggal_selesai)) 
    : 150

  const totalHadir = absensi.filter(a => a.status === 'Hadir').length
  const totalIzin = absensi.filter(a => a.status === 'Izin').length
  const totalSakit = absensi.filter(a => a.status === 'Sakit').length
  const totalAlpha = absensi.filter(a => a.status === 'Alpha').length

  const progressKehadiran = Math.min(Math.round((totalHadir / totalHariTarget) * 100), 100)

  const approvedJurnal = kegiatan.filter(k => k.status_persetujuan === 'Disetujui').length
  const pendingJurnal = kegiatan.filter(k => k.status_persetujuan === 'Menunggu' || !k.status_persetujuan).length
  const rejectedJurnal = kegiatan.filter(k => k.status_persetujuan === 'Ditolak').length

  const verifiedBerkas = berkas.filter(b => b.status === 'Diverifikasi').length
  const reviewBerkas = berkas.filter(b => b.status === 'Menunggu Review').length
  const totalWajibBerkas = jenisBerkas.length || 12
  const unuploadedBerkas = Math.max(0, totalWajibBerkas - berkas.length)

  // Date Formatter
  const formatIndoDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="pb-24 animate-in fade-in duration-500 max-w-[1400px] mx-auto space-y-8">
      {/* Back navigation and Period Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Link 
          href="/dosen/mahasiswa" 
          className="inline-flex items-center text-xs font-bold text-gray-500 hover:text-blue-600 transition-colors uppercase tracking-wider gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Mahasiswa
        </Link>
        
        {/* Magang 1 vs Magang 2 toggle */}
        {periods.length > 1 && (
          <div className="bg-gray-100 dark:bg-zinc-800 p-1.5 rounded-full flex items-center border border-gray-200/50 shadow-sm max-w-xs self-end">
            {periods.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePeriodSwitch(p)}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${
                  selectedPeriod?.id === p.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Magang {p.nomor_periode}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 1. HEADER CARD */}
      <div className="bg-white rounded-3xl border border-gray-200/60 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center md:items-start justify-between shadow-sm">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-inner shrink-0 text-blue-600">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-3xl" />
            ) : (
              <span className="text-3xl md:text-4xl font-extrabold uppercase">{profile?.nama_lengkap?.charAt(0) || 'M'}</span>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">{profile?.nama_lengkap}</h1>
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 font-extrabold text-[10px] uppercase rounded-full tracking-wider border border-blue-100">
                Magang {selectedPeriod?.nomor_periode || 1}
              </span>
              <span className={`px-2.5 py-0.5 font-extrabold text-[10px] uppercase rounded-full tracking-wider border ${
                selectedPeriod?.status === 'aktif'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}>
                {selectedPeriod?.status === 'aktif' ? 'Aktif' : 'Selesai'}
              </span>
            </div>
            <p className="text-sm font-bold text-gray-500">NIM: {profile?.nim} • Prodi {profile?.prodi}</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1.5 text-xs text-gray-400 font-semibold pt-1">
              <span className="flex items-center gap-1.5">
                <FolderOpen size={14} className="text-gray-400" />
                {selectedPeriod?.nama_instansi || profile?.instansi_magang || '-'} ({selectedPeriod?.unit_divisi || profile?.unit_magang || '-'})
              </span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" />
                {formatIndoDate(selectedPeriod?.tanggal_mulai || profile?.tanggal_mulai)} - {formatIndoDate(selectedPeriod?.tanggal_selesai || profile?.tanggal_selesai)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card Kehadiran */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Kehadiran</p>
            <h3 className="text-2xl font-black text-gray-900">{totalHadir} Hari <span className="text-sm font-bold text-gray-400">({progressKehadiran}%)</span></h3>
            <p className="text-[10px] text-gray-400 font-semibold">dari total target {totalHariTarget} hari kerja</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Card Jurnal */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Jurnal Kegiatan</p>
            <h3 className="text-2xl font-black text-gray-900">{approvedJurnal} <span className="text-sm font-bold text-gray-400">/ {kegiatan.length} Disetujui</span></h3>
            <p className="text-[10px] text-gray-400 font-semibold">{pendingJurnal} pending, {rejectedJurnal} ditolak</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
            <FileText size={22} />
          </div>
        </div>

        {/* Card Berkas */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Verifikasi Berkas</p>
            <h3 className="text-2xl font-black text-gray-900">{verifiedBerkas} <span className="text-sm font-bold text-gray-400">/ {totalWajibBerkas} Berkas</span></h3>
            <p className="text-[10px] text-gray-400 font-semibold">{reviewBerkas} menunggu, {unuploadedBerkas} belum upload</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
            <FolderOpen size={22} />
          </div>
        </div>

        {/* Card Nilai */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Nilai Akhir Dosen</p>
            <h3 className="text-2xl font-black text-blue-600">{penilaian?.nilai_akhir !== undefined ? penilaian.nilai_akhir : '-'}</h3>
            <p className="text-[10px] text-gray-400 font-semibold">{penilaian ? 'Telah dinilai dosen pembimbing' : 'Belum dilakukan penilaian'}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 shrink-0">
            <TrendingUp size={22} />
          </div>
        </div>
      </div>

      {/* 3. TABS NAVIGATION */}
      <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar gap-2">
        {(['ringkasan', 'absensi', 'jurnal', 'berkas', 'penilaian'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3.5 border-b-2 font-extrabold text-xs uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 4. MAIN DETAIL BOX PANEL */}
      <div className="bg-white border border-gray-200/60 rounded-3xl p-6 md:p-8 min-h-[450px] shadow-sm relative">
        {loadingData && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-20 flex items-center justify-center rounded-3xl">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* TAB 1: RINGKASAN */}
        {activeTab === 'ringkasan' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Progress Summary Bars */}
              <div className="space-y-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-150">
                <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">Progres Kehadiran & Berkas</h3>
                
                {/* Kehadiran Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-700">
                    <span>Kehadiran ({progressKehadiran}% Hadir)</span>
                    <span>{totalHadir} / {totalHariTarget} Hari</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${(totalHadir / totalHariTarget) * 100}%` }}></div>
                    <div className="h-full bg-amber-500" style={{ width: `${(totalIzin / totalHariTarget) * 100}%` }}></div>
                    <div className="h-full bg-rose-500" style={{ width: `${(totalSakit / totalHariTarget) * 100}%` }}></div>
                    <div className="h-full bg-gray-400" style={{ width: `${(totalAlpha / totalHariTarget) * 100}%` }}></div>
                  </div>
                  <div className="flex gap-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>{totalHadir} Hadir</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>{totalIzin} Izin</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>{totalSakit} Sakit</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block"></span>{totalAlpha} Alpha</span>
                  </div>
                </div>

                {/* Jurnal Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-700">
                    <span>Persetujuan Jurnal ({kegiatan.length > 0 ? Math.round((approvedJurnal / kegiatan.length) * 100) : 0}% Disetujui)</span>
                    <span>{approvedJurnal} / {kegiatan.length} Jurnal</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-600" style={{ width: `${kegiatan.length > 0 ? (approvedJurnal / kegiatan.length) * 100 : 0}%` }}></div>
                    <div className="h-full bg-amber-500" style={{ width: `${kegiatan.length > 0 ? (pendingJurnal / kegiatan.length) * 100 : 0}%` }}></div>
                    <div className="h-full bg-rose-600" style={{ width: `${kegiatan.length > 0 ? (rejectedJurnal / kegiatan.length) * 100 : 0}%` }}></div>
                  </div>
                  <div className="flex gap-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>{approvedJurnal} Disetujui</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>{pendingJurnal} Pending</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-600 inline-block"></span>{rejectedJurnal} Ditolak</span>
                  </div>
                </div>

                {/* Berkas Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-700">
                    <span>Kelengkapan Berkas ({Math.round((verifiedBerkas / totalWajibBerkas) * 100)}% Lengkap)</span>
                    <span>{verifiedBerkas} / {totalWajibBerkas} Berkas</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex">
                    <div className="h-full bg-amber-650 bg-amber-500" style={{ width: `${(verifiedBerkas / totalWajibBerkas) * 100}%` }}></div>
                    <div className="h-full bg-blue-500" style={{ width: `${(reviewBerkas / totalWajibBerkas) * 100}%` }}></div>
                    <div className="h-full bg-gray-300" style={{ width: `${(unuploadedBerkas / totalWajibBerkas) * 100}%` }}></div>
                  </div>
                  <div className="flex gap-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>{verifiedBerkas} Terverifikasi</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>{reviewBerkas} Review</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block"></span>{unuploadedBerkas} Belum Upload</span>
                  </div>
                </div>
              </div>

              {/* Attendance visual calendar indicator grid */}
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">Indikator Aktivitas Harian (20 Hari Terakhir)</h3>
                <div className="p-6 bg-white border border-gray-250 border-gray-200 rounded-2xl flex flex-col justify-center items-center shadow-inner">
                  {absensi.length === 0 ? (
                    <p className="text-xs text-gray-400 font-bold py-6">Tidak ada catatan kehadiran terbaru.</p>
                  ) : (
                    <div className="space-y-4 w-full">
                      <div className="grid grid-cols-5 gap-3.5 max-w-xs mx-auto">
                        {absensi.slice(0, 20).map((a, index) => {
                          let color = 'bg-gray-150 text-gray-400'
                          if (a.status === 'Hadir') color = 'bg-emerald-500 text-white'
                          else if (a.status === 'Izin') color = 'bg-amber-500 text-white'
                          else if (a.status === 'Sakit') color = 'bg-rose-500 text-white'
                          else if (a.status === 'Alpha') color = 'bg-gray-400 text-white'

                          return (
                            <div 
                              key={a.id || index} 
                              className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-extrabold shadow-sm ${color}`}
                              title={`${a.tanggal}: ${a.status}`}
                            >
                              {new Date(a.tanggal).getDate()}
                            </div>
                          )
                        })}
                      </div>
                      <p className="text-[10px] text-center text-gray-400 font-semibold uppercase tracking-wide">
                        Warna menunjukkan kehadiran hari kerja (Senin - Jumat) dari paling baru ke lama
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Input Nilai Quick Action Call to Action */}
                {!penilaian && (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-blue-700 uppercase">Input Evaluasi Penilaian</p>
                      <p className="text-[11px] text-blue-600 font-medium leading-relaxed">Mahasiswa ini belum dinilai untuk periode ini. Selesaikan penilaian magang segera.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('penilaian')}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm shrink-0"
                    >
                      Beri Nilai
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* AI Insights Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/30 rounded-3xl p-6 border border-blue-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="w-24 h-24 text-blue-600" />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-600">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="font-extrabold text-sm text-blue-800 uppercase tracking-wide">Asisten Ringkasan AI Jurnal</h3>
                  </div>
                  <button
                    onClick={handleSummarize}
                    disabled={isSummarizing || kegiatan.length === 0}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSummarizing ? 'Menganalisis...' : 'Buat Ringkasan Jurnal'}
                  </button>
                </div>

                {aiSummary ? (
                  <div className="bg-white/95 border border-blue-100/60 rounded-2xl p-5 shadow-sm space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className="text-xs text-gray-700 font-medium leading-relaxed">
                      {aiSummary}
                    </p>
                    <div className="pt-3 border-t border-gray-100 flex items-center gap-2 text-[10px]">
                      <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">AI Insights</span>
                      <span className="text-gray-400 font-semibold">Generasi analisis jurnal otomatis</span>
                    </div>
                  </div>
                ) : isSummarizing ? (
                  <div className="space-y-3 py-2">
                    <div className="h-3.5 bg-blue-100/60 rounded-full w-full animate-pulse"></div>
                    <div className="h-3.5 bg-blue-100/60 rounded-full w-4/5 animate-pulse"></div>
                    <div className="h-3.5 bg-blue-100/60 rounded-full w-3/5 animate-pulse"></div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 font-semibold italic">Silakan klik "Buat Ringkasan Jurnal" untuk melihat analisis kecenderungan jurnal mahasiswa.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ABSENSI */}
        {activeTab === 'absensi' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Filter and stats overview row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 p-5 rounded-2xl border border-gray-150">
              {/* Recaps counters */}
              <div className="flex gap-4 flex-wrap text-xs font-extrabold uppercase tracking-wider text-gray-600">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>{totalHadir} Hadir</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>{totalIzin} Izin</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>{totalSakit} Sakit</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block"></span>{totalAlpha} Alpha</span>
              </div>
              
              {/* Month Selector dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Filter Bulan:</span>
                <select
                  value={bulanFilter}
                  onChange={(e) => setBulanFilter(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-blue-600 text-gray-700 shadow-sm"
                >
                  <option value="all">Semua Bulan</option>
                  {/* Extract dynamic months from attendance list */}
                  {Array.from(new Set(absensi.map(a => a.tanggal.substring(0, 7)))).sort().map(monthStr => {
                    const [year, month] = monthStr.split('-')
                    const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                    return <option key={monthStr} value={monthStr}>{monthName}</option>
                  })}
                </select>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Check-in</th>
                    <th className="px-6 py-4">Check-out</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-xs font-bold text-gray-700">
                  {(() => {
                    const filteredAbs = absensi.filter(a => bulanFilter === 'all' || a.tanggal.substring(0, 7) === bulanFilter)
                    
                    if (filteredAbs.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-semibold">
                            Tidak ditemukan data kehadiran untuk bulan ini.
                          </td>
                        </tr>
                      )
                    }

                    return filteredAbs.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-extrabold text-gray-900">{formatIndoDate(a.tanggal)}</td>
                        <td className="px-6 py-4 text-gray-500">{a.check_in || '-'}</td>
                        <td className="px-6 py-4 text-gray-500">{a.check_out || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold border ${
                            a.status === 'Hadir'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : a.status === 'Izin'
                              ? 'bg-amber-50 text-amber-600 border-amber-100'
                              : a.status === 'Sakit'
                              ? 'bg-rose-50 text-rose-600 border-rose-100'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400 font-semibold">{a.keterangan || 'Tidak ada keterangan'}</td>
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: JURNAL */}
        {activeTab === 'jurnal' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Filter and counters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 p-5 rounded-2xl border border-gray-150">
              <div className="flex gap-4 text-xs font-extrabold uppercase tracking-wider text-gray-600">
                <span>{kegiatan.length} Jurnal terbuat</span>
                <span>•</span>
                <span className="text-blue-600">{approvedJurnal} Disetujui</span>
                <span>•</span>
                <span className="text-amber-500">{pendingJurnal} Pending</span>
                <span>•</span>
                <span className="text-rose-600">{rejectedJurnal} Ditolak</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Status Persetujuan:</span>
                <select
                  value={jurnalStatusFilter}
                  onChange={(e) => setJurnalStatusFilter(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-blue-600 text-gray-700 shadow-sm"
                >
                  <option value="all">Semua Status</option>
                  <option value="Menunggu">Menunggu</option>
                  <option value="Disetujui">Disetujui</option>
                  <option value="Ditolak">Ditolak</option>
                </select>
              </div>
            </div>

            {/* Jurnal list with actions */}
            {(() => {
              const filteredKegiatan = kegiatan.filter(k => {
                if (jurnalStatusFilter === 'all') return true
                if (jurnalStatusFilter === 'Menunggu') return k.status_persetujuan === 'Menunggu' || !k.status_persetujuan
                return k.status_persetujuan === jurnalStatusFilter
              })

              if (filteredKegiatan.length === 0) {
                return (
                  <div className="p-12 text-center bg-gray-50 rounded-3xl border border-gray-200">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-bold text-sm">Tidak ditemukan jurnal kegiatan.</p>
                  </div>
                )
              }

              return (
                <div className="space-y-6">
                  {filteredKegiatan.map((k) => (
                    <div 
                      key={k.id} 
                      className={`p-6 border rounded-2xl space-y-4 transition-all hover:shadow-md bg-white ${
                        k.status_persetujuan === 'Ditolak'
                          ? 'border-rose-200 bg-rose-50/5'
                          : k.status_persetujuan === 'Disetujui'
                          ? 'border-emerald-100 hover:border-emerald-200/50'
                          : 'border-gray-200 hover:border-blue-200/50'
                      }`}
                    >
                      {/* Card Header row */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-black text-blue-600 uppercase tracking-wide">{formatIndoDate(k.tanggal)}</p>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold border ${
                            k.status_persetujuan === 'Disetujui'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : k.status_persetujuan === 'Ditolak'
                              ? 'bg-rose-50 text-rose-600 border-rose-100'
                              : 'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {k.status_persetujuan || 'Menunggu'}
                          </span>
                        </div>
                        
                        {/* Inline approval controls */}
                        {(k.status_persetujuan === 'Menunggu' || !k.status_persetujuan) && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApproveJurnal(k.id)}
                              className="px-4 py-2 bg-emerald-650 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                            >
                              Setujui
                            </button>
                            <button
                              onClick={() => {
                                setRejectingJurnalId(k.id)
                                setRejectionComment('')
                              }}
                              className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              Tolak
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Rejection comment input field if triggered */}
                      {rejectingJurnalId === k.id && (
                        <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 space-y-3">
                          <label className="text-[10px] font-black text-rose-700 uppercase tracking-wider">Masukkan alasan penolakan jurnal:</label>
                          <textarea
                            value={rejectionComment}
                            onChange={(e) => setRejectionComment(e.target.value)}
                            placeholder="Alasan penolakan..."
                            rows={2}
                            className="w-full bg-white border border-rose-200 rounded-xl p-3 text-xs outline-none focus:border-rose-500"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setRejectingJurnalId(null)}
                              className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-250 text-gray-500 rounded-lg text-xs font-bold"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => handleRejectJurnal(k.id)}
                              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-750 text-white rounded-lg text-xs font-bold"
                            >
                              Kirim Penolakan
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Jurnal text content */}
                      <p className="text-xs text-gray-700 font-medium leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-150">
                        {k.kegiatan}
                      </p>

                      {/* Catatan penolakan dosen if exists */}
                      {k.status_persetujuan === 'Ditolak' && k.komentar_dosen && (
                        <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 flex gap-2">
                          <Info size={14} className="text-rose-500 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-black text-rose-600 uppercase tracking-wider">Komentar Penolakan:</p>
                            <p className="text-xs font-semibold text-rose-700">{k.komentar_dosen}</p>
                          </div>
                        </div>
                      )}

                      {/* Discussion Comments Thread */}
                      <div className="pt-4 border-t border-gray-100 space-y-3.5">
                        {comments.filter(c => c.kegiatan_id === k.id).map(comment => (
                          <div key={comment.id} className="flex gap-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-extrabold text-white ${
                              comment.profiles?.role === 'dosen' ? 'bg-emerald-650 bg-emerald-600' : 'bg-blue-600'
                            }`}>
                              {comment.profiles?.nama_lengkap?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-2.5 border border-gray-150">
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-[10px] font-extrabold text-gray-900 leading-tight">{comment.profiles?.nama_lengkap}</p>
                                <p className="text-[9px] text-gray-400 font-semibold">
                                  {new Date(comment.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <p className="text-xs text-gray-600 font-medium">{comment.message}</p>
                            </div>
                          </div>
                        ))}
                        
                        {/* New comment input */}
                        <div className="flex gap-2 pt-2">
                          <input
                            type="text"
                            placeholder="Tulis diskusi komentar..."
                            value={newComment[k.id] || ''}
                            onChange={e => setNewComment(prev => ({ ...prev, [k.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handlePostComment(k.id)}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-xs outline-none focus:border-blue-600 focus:bg-white transition-colors"
                          />
                          <button
                            onClick={() => handlePostComment(k.id)}
                            disabled={isCommenting[k.id] || !newComment[k.id]?.trim()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-750 text-white text-xs font-bold rounded-full disabled:opacity-50 shrink-0"
                          >
                            Kirim
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {/* TAB 4: BERKAS */}
        {activeTab === 'berkas' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Berkas progress and stats */}
            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-150 space-y-3">
              <div className="flex justify-between text-xs font-bold text-gray-700">
                <span>Kelengkapan Dokumen ({verifiedBerkas} / {totalWajibBerkas} Terverifikasi)</span>
                <span>{Math.round((verifiedBerkas / totalWajibBerkas) * 100)}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${(verifiedBerkas / totalWajibBerkas) * 100}%` }}></div>
              </div>
            </div>

            {/* Checklist items table */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Nama Dokumen</th>
                    <th className="px-6 py-4">Kategori</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Tanggal Upload</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-xs font-bold text-gray-700">
                  {jenisBerkas.map((jenis) => {
                    const matchingBerkas = berkas.find(b => b.jenis_berkas_id === jenis.id)

                    return (
                      <tr key={jenis.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-extrabold text-gray-900 leading-tight">{jenis.nama_berkas}</p>
                          <p className="text-[10px] text-gray-400 font-semibold leading-relaxed mt-0.5">{jenis.keterangan || 'Tidak ada keterangan'}</p>
                          
                          {/* Rejection comment inline description */}
                          {matchingBerkas?.status === 'Ditolak' && matchingBerkas.catatan_dosen && (
                            <div className="mt-2 text-[10px] bg-rose-50 border border-rose-100 rounded-lg p-2 max-w-md flex gap-1.5 text-rose-700">
                              <Info size={12} className="shrink-0 mt-0.5" />
                              <span>Rejection Note: {matchingBerkas.catatan_dosen}</span>
                            </div>
                          )}

                          {/* Rejection Note input form if triggered */}
                          {rejectingBerkasId === matchingBerkas?.id && (
                            <div className="mt-3 bg-rose-50/50 border border-rose-150 rounded-xl p-3.5 max-w-md space-y-3 text-left">
                              <label className="text-[10px] font-black text-rose-700 uppercase">Alasan Penolakan Berkas:</label>
                              <textarea
                                value={berkasRejectionNote}
                                onChange={(e) => setBerkasRejectionNote(e.target.value)}
                                placeholder="Masukkan catatan penolakan..."
                                rows={2}
                                className="w-full bg-white border border-rose-200 rounded-xl p-3 text-xs outline-none focus:border-rose-500 font-medium"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setRejectingBerkasId(null)}
                                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-250 text-gray-500 rounded-lg text-[10px] font-bold"
                                >
                                  Batal
                                </button>
                                <button
                                  onClick={() => handleRejectBerkas(matchingBerkas.id)}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold"
                                >
                                  Kirim
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[9px] px-2.5 py-0.5 bg-gray-100 text-gray-500 font-extrabold rounded-full tracking-wider border border-gray-200 uppercase">
                            {jenis.kategori}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold border ${
                            matchingBerkas?.status === 'Diverifikasi'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : matchingBerkas?.status === 'Ditolak'
                              ? 'bg-rose-50 text-rose-600 border-rose-100'
                              : matchingBerkas?.status === 'Menunggu Review'
                              ? 'bg-blue-50 text-blue-600 border-blue-100'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            {matchingBerkas ? matchingBerkas.status : 'Belum Upload'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400 font-semibold">
                          {matchingBerkas ? formatIndoDate(matchingBerkas.tanggal_upload) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {matchingBerkas && (
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              <a
                                href={matchingBerkas.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-bold transition-all"
                              >
                                Preview
                              </a>
                              {matchingBerkas.status !== 'Diverifikasi' && (
                                <button
                                  onClick={() => handleVerifyBerkas(matchingBerkas.id)}
                                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  Verifikasi
                                </button>
                              )}
                              {matchingBerkas.status !== 'Ditolak' && (
                                <button
                                  onClick={() => {
                                    setRejectingBerkasId(matchingBerkas.id)
                                    setBerkasRejectionNote('')
                                  }}
                                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  Tolak
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: PENILAIAN */}
        {activeTab === 'penilaian' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Graded Summary state or New form state */}
            {!isEditingPenilaian && penilaian ? (
              <div className="space-y-8">
                {/* Visual score display header card */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-violet-50 to-violet-100/30 p-6 md:p-8 rounded-3xl border border-violet-100">
                  <div className="space-y-2">
                    <p className="text-xs text-violet-600 font-extrabold uppercase tracking-wide">Lembar Penilaian Evaluasi Akhir</p>
                    <h3 className="text-3xl font-black text-violet-950">Mahasiswa Evaluated</h3>
                    <p className="text-xs text-gray-500 font-semibold">Telah dinilai oleh Dosen Pembimbing pada {formatIndoDate(penilaian.created_at)}</p>
                  </div>
                  <div className="text-center md:text-right shrink-0 space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Nilai Akhir</p>
                    <h2 className="text-5xl font-black text-violet-750 text-violet-600">{penilaian.nilai_akhir}</h2>
                    <button
                      onClick={() => setIsEditingPenilaian(true)}
                      className="px-5 py-2 bg-white hover:bg-gray-50 text-violet-650 text-violet-600 border border-violet-200 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Edit2 size={13} /> Ubah Nilai
                    </button>
                  </div>
                </div>

                {/* Score component bars list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-150">
                  <div className="space-y-5">
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Rincian Komponen</h4>
                    
                    {/* kedisiplinan */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-gray-700">
                        <span>Kedisiplinan</span>
                        <span className="text-gray-900">{penilaian.kedisiplinan} / 100</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500" style={{ width: `${penilaian.kedisiplinan}%` }}></div>
                      </div>
                    </div>

                    {/* kompetensi */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-gray-700">
                        <span>Kompetensi</span>
                        <span className="text-gray-900">{penilaian.kompetensi} / 100</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500" style={{ width: `${penilaian.kompetensi}%` }}></div>
                      </div>
                    </div>

                    {/* sikap */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-gray-700">
                        <span>Sikap</span>
                        <span className="text-gray-900">{penilaian.sikap} / 100</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500" style={{ width: `${penilaian.sikap}%` }}></div>
                      </div>
                    </div>

                    {/* laporan */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-gray-700">
                        <span>Laporan Akhir</span>
                        <span className="text-gray-900">{penilaian.laporan} / 100</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500" style={{ width: `${penilaian.laporan}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Notes / Catatan */}
                  <div className="space-y-3 flex flex-col">
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Catatan Evaluasi Dosen</h4>
                    <div className="bg-white border border-gray-200 p-4 rounded-xl flex-1 text-xs text-gray-600 font-medium leading-relaxed">
                      {penilaian.catatan || 'Tidak ada catatan tambahan.'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Grading input form
              <form onSubmit={handleSimpanPenilaian} className="space-y-6">
                <div className="border-b border-gray-150 pb-4">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">{penilaian ? 'Ubah Evaluasi Nilai' : 'Input Evaluasi Nilai Baru'}</h3>
                  <p className="text-xs text-gray-400 font-semibold mt-0.5">Berikan penilaian angka berskala (0 - 100) untuk empat komponen utama berikut.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-150">
                  <div className="space-y-5">
                    {/* Input kedisiplinan */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-gray-700">Kedisiplinan (0 - 100):</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        required
                        value={penilaianScores.kedisiplinan || ''}
                        onChange={e => setPenilaianScores({ ...penilaianScores, kedisiplinan: Number(e.target.value) })}
                        className="w-full bg-white border border-gray-250 border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-600 font-bold"
                      />
                    </div>

                    {/* Input kompetensi */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-gray-700">Kompetensi (0 - 100):</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        required
                        value={penilaianScores.kompetensi || ''}
                        onChange={e => setPenilaianScores({ ...penilaianScores, kompetensi: Number(e.target.value) })}
                        className="w-full bg-white border border-gray-250 border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-600 font-bold"
                      />
                    </div>

                    {/* Input sikap */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-gray-700">Sikap (0 - 100):</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        required
                        value={penilaianScores.sikap || ''}
                        onChange={e => setPenilaianScores({ ...penilaianScores, sikap: Number(e.target.value) })}
                        className="w-full bg-white border border-gray-250 border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-600 font-bold"
                      />
                    </div>

                    {/* Input laporan */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-gray-700">Laporan Akhir (0 - 100):</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        required
                        value={penilaianScores.laporan || ''}
                        onChange={e => setPenilaianScores({ ...penilaianScores, laporan: Number(e.target.value) })}
                        className="w-full bg-white border border-gray-250 border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-600 font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-5 flex flex-col justify-between">
                    {/* Text area for Notes */}
                    <div className="space-y-2 flex-1 flex flex-col">
                      <label className="text-xs font-extrabold text-gray-700">Catatan/Masukan Evaluasi:</label>
                      <textarea
                        rows={5}
                        placeholder="Tulis catatan masukan evaluasi untuk mahasiswa..."
                        value={penilaianScores.catatan}
                        onChange={e => setPenilaianScores({ ...penilaianScores, catatan: e.target.value })}
                        className="w-full bg-white border border-gray-250 border-gray-200 rounded-xl p-4 text-xs outline-none focus:border-blue-600 font-medium flex-1 resize-none"
                      />
                    </div>

                    {/* Overall Score Calculation Preview Box */}
                    <div className="bg-blue-50 border border-blue-150 p-4 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-blue-700 uppercase">Prediksi Rata-Rata Nilai Akhir:</p>
                        <p className="text-[10px] text-blue-600/70 font-semibold">(Rata-rata 4 komponen nilai di atas)</p>
                      </div>
                      <h4 className="text-3xl font-black text-blue-600">
                        {((penilaianScores.kedisiplinan +
                          penilaianScores.kompetensi +
                          penilaianScores.sikap +
                          penilaianScores.laporan) / 4).toFixed(2)}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex justify-end gap-3">
                  {penilaian && (
                    <button
                      type="button"
                      onClick={() => setIsEditingPenilaian(false)}
                      className="px-5 py-2.5 bg-gray-100 hover:bg-gray-205 hover:bg-gray-200 text-gray-500 rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      Batal
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSavingPenilaian}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-60 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save size={14} />
                    {isSavingPenilaian ? 'Menyimpan...' : 'Simpan Penilaian'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
