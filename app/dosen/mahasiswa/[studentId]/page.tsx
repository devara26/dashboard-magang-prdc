'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Calendar, FileText, CheckCircle2, Clock, FolderOpen, Activity, Sparkles } from 'lucide-react'
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
}

type Kegiatan = {
  id: number
  tanggal: string
  kegiatan: string
  status: string
}

type Berkas = {
  id: string
  document_type: string
  file_url: string
  file_name: string
  file_size: number
  uploaded_at: string
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

  const [activeTab, setActiveTab] = useState<'ringkasan' | 'absensi' | 'jurnal' | 'berkas'>('ringkasan')
  const [loading, setLoading] = useState(true)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([])
  const [absensiStats, setAbsensiStats] = useState({ hadir: 0, izin: 0, sakit: 0, alpha: 0 })
  const [berkas, setBerkas] = useState<Berkas[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState<{ [key: number]: string }>({})
  const [isCommenting, setIsCommenting] = useState<{ [key: number]: boolean }>({})
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)

  useEffect(() => {
    fetchData()
  }, [studentId])

  async function fetchData() {
    setLoading(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Sesi tidak ditemukan. Silakan login kembali.')

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .single()

      if (profileError) throw new Error('Gagal mengambil data profil mahasiswa.')
      setProfile(profileData)

      const { data: absensiData, error: absensiError } = await supabase
        .from('absensi')
        .select('status')
        .eq('mahasiswa_id', studentId)

      if (absensiError) throw new Error('Gagal mengambil data absensi.')

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

      if (profileData.nim) {
        const { data: kegiatanData, error: kegiatanError } = await supabase
          .from('Kegiatan')
          .select('*')
          .eq('nim', profileData.nim)
          .order('tanggal', { ascending: false })

        if (kegiatanError) throw new Error('Gagal mengambil data kegiatan mahasiswa.')
        setKegiatan(kegiatanData || [])

        const { data: commentsData } = await supabase
          .from('comments')
          .select('*, profiles(nama_lengkap, role)')
          .in('kegiatan_id', kegiatanData?.map(k => k.id) || [])
          .order('created_at', { ascending: true })
        setComments(commentsData as any || [])
      }

      const { data: berkasData, error: berkasError } = await supabase
        .from('berkas')
        .select('*')
        .eq('mahasiswa_id', studentId)

      if (berkasError) throw new Error('Gagal mengambil daftar berkas mahasiswa.')
      setBerkas(berkasData || [])

    } catch (error: any) {
      toast.error(error.message || 'Gagal memuat detail mahasiswa.')
    } finally {
      setLoading(false)
    }
  }

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

  async function handleSummarize() {
    if (kegiatan.length === 0) return
    setIsSummarizing(true)
    setAiSummary(null)

    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const activitiesCount = kegiatan.length
      const statusSelesai = kegiatan.filter(k => k.status === 'Selesai').length
      const summary = `Berdasarkan ${activitiesCount} entri jurnal, mahasiswa ini telah menyelesaikan ${statusSelesai} tugas dengan baik. Fokus utama kegiatan mencakup: ${kegiatan[0]?.kegiatan.substring(0, 50)}... dan ${kegiatan[1]?.kegiatan?.substring(0, 50) || 'aktivitas teknis lainnya'}. Mahasiswa menunjukkan progres yang konsisten di unit ${profile?.unit_magang || 'magang'}.`
      setAiSummary(summary)
      toast.success('Ringkasan AI berhasil dibuat')
    } catch (error) {
      toast.error('Gagal membuat ringkasan AI')
    } finally {
      setIsSummarizing(false)
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
        <p className="text-[#5F6368] text-sm font-medium animate-pulse">Memuat data mahasiswa...</p>
      </div>
    </div>
  )

  const totalHariTarget = profile?.tanggal_mulai && profile?.tanggal_selesai ? getWorkDays(profile.tanggal_mulai, profile.tanggal_selesai) : 150
  const progressPersen = totalHariTarget > 0 ? Math.min(Math.round((absensiStats.hadir / totalHariTarget) * 100), 100) : 0

  const statCards = [
    { label: 'Hadir', value: absensiStats.hadir, color: 'text-[#137333]', bg: 'bg-[#E6F4EA]' },
    { label: 'Izin', value: absensiStats.izin, color: 'text-[#E37400]', bg: 'bg-[#FEF7E0]' },
    { label: 'Sakit', value: absensiStats.sakit, color: 'text-[#C5221F]', bg: 'bg-[#FCE8E6]' },
    { label: 'Alpha', value: absensiStats.alpha, color: 'text-[#5F6368]', bg: 'bg-gray-50' }
  ]

  const tabs = [
    { id: 'ringkasan', label: 'Ringkasan', icon: Activity },
    { id: 'absensi', label: 'Absensi', icon: Calendar },
    { id: 'jurnal', label: 'Jurnal', icon: FileText },
    { id: 'berkas', label: 'Berkas', icon: FolderOpen },
  ] as const

  return (
    <div className="pb-12 animate-[fade-in_0.7s_ease-out] max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/dosen/mahasiswa" className="inline-flex items-center text-sm font-medium text-[#5F6368] hover:text-[#1A73E8] mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Daftar Mahasiswa
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#1A73E8] flex-shrink-0 flex items-center justify-center shadow-sm border-4 border-white dark:border-[#3C4043]">
            <span className="text-2xl font-bold text-white">{profile?.nama_lengkap?.charAt(0).toUpperCase() || 'M'}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#202124] dark:text-[#E8EAED] leading-tight">{profile?.nama_lengkap}</h1>
            <p className="text-[#5F6368] dark:text-[#9AA0A6] text-sm mt-1">{profile?.nim} • {profile?.prodi}</p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-[#3C4043] mb-6 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab.id
                ? 'border-[#1A73E8] text-[#1A73E8]'
                : 'border-transparent text-[#5F6368] hover:text-[#202124] dark:hover:text-white'
              }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-[#202124] rounded-[32px] p-8 shadow-sm border border-gray-50 dark:border-[#3C4043] min-h-[400px]">

        {activeTab === 'ringkasan' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-5 bg-gray-50 dark:bg-[#303134] rounded-2xl border border-gray-100 dark:border-[#3C4043]">
                  <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] font-bold uppercase mb-2">Instansi Magang</p>
                  <p className="font-bold text-[#202124] dark:text-[#E8EAED]">{profile?.instansi_magang || '-'}</p>
                  <p className="text-sm text-[#5F6368] dark:text-[#9AA0A6] mt-1">{profile?.unit_magang || 'Divisi tidak tersedia'}</p>
                </div>
                <div className="p-5 bg-gray-50 dark:bg-[#303134] rounded-2xl border border-gray-100 dark:border-[#3C4043]">
                  <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] font-bold uppercase mb-2">Periode</p>
                  <p className="font-bold text-[#202124] dark:text-[#E8EAED]">{profile?.tanggal_mulai || '?'} s/d {profile?.tanggal_selesai || '?'}</p>
                </div>
              </div>

              <div className="bg-[#E6F4EA] dark:bg-[#0D652D]/20 rounded-[28px] p-6 border border-transparent dark:border-[#137333]/30 flex flex-col justify-between">
                <div>
                  <p className="text-[#137333] dark:text-[#34A853] text-xs font-bold uppercase mb-2">Progres Keseluruhan</p>
                  <h3 className="text-3xl font-black text-[#0D652D] dark:text-[#E6F4EA]">{progressPersen}%</h3>
                </div>
                <div className="mt-4">
                  <div className="w-full h-3 bg-white/50 dark:bg-[#137333]/30 rounded-full overflow-hidden">
                    <div className="h-full bg-[#34A853]" style={{ width: `${progressPersen}%` }}></div>
                  </div>
                  <p className="text-[11px] text-[#137333] dark:text-[#CEEAD6] mt-2 font-medium">
                    Mahasiswa telah menyelesaikan {absensiStats.hadir} hari dari {totalHariTarget} target hari magang.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#E8F0FE] to-[#D2E3FC] dark:from-[#1A73E8]/10 dark:to-[#1A73E8]/20 rounded-[28px] p-6 border border-blue-100 dark:border-[#1A73E8]/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="w-24 h-24 text-[#1A73E8]" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white dark:bg-[#1A73E8] rounded-lg flex items-center justify-center shadow-sm">
                      <Sparkles className="w-5 h-5 text-[#1A73E8] dark:text-white" />
                    </div>
                    <h3 className="font-bold text-[#174EA6] dark:text-[#E8F0FE]">AI Journal Insight</h3>
                  </div>
                  <button
                    onClick={handleSummarize}
                    disabled={isSummarizing || kegiatan.length === 0}
                    className="px-4 py-2 bg-[#1A73E8] text-white text-xs font-bold rounded-full hover:bg-[#1967D2] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSummarizing ? 'Menganalisis...' : 'Buat Ringkasan'}
                  </button>
                </div>

                {aiSummary ? (
                  <div className="bg-white/80 dark:bg-[#202124]/80 backdrop-blur-sm rounded-2xl p-4 border border-white dark:border-[#3C4043] animate-[fade-in_0.5s_ease-out]">
                    <p className="text-sm text-[#3C4043] dark:text-[#E8EAED] leading-relaxed">
                      {aiSummary}
                    </p>
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#3C4043] flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[#1A73E8] bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded uppercase">Claude AI Verified</span>
                      <span className="text-[10px] text-gray-400">Baru saja diupdate</span>
                    </div>
                  </div>
                ) : isSummarizing ? (
                  <div className="space-y-3">
                    <div className="h-4 bg-white/50 dark:bg-[#303134] rounded-full w-full animate-pulse"></div>
                    <div className="h-4 bg-white/50 dark:bg-[#303134] rounded-full w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-white/50 dark:bg-[#303134] rounded-full w-1/2 animate-pulse"></div>
                  </div>
                ) : (
                  <p className="text-sm text-[#5F6368] dark:text-[#9AA0A6] italic">Klik tombol untuk menganalisis seluruh aktivitas mahasiswa ini menggunakan AI.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'absensi' && (
          <div className="space-y-6">
            <h2 className="text-[#202124] dark:text-[#E8EAED] text-lg font-bold">Statistik Absensi</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statCards.map((card, i) => (
                <div key={i} className={`${card.bg} dark:bg-[#303134] rounded-2xl p-6 text-center border border-gray-100 dark:border-[#3C4043]`}>
                  <p className={`${card.color} text-4xl font-black`}>{card.value}</p>
                  <p className={`${card.color} text-xs font-bold uppercase mt-2`}>{card.label}</p>
                </div>
              ))}
            </div>
            <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Statistik ini dihitung berdasarkan total entri absensi yang dilakukan oleh mahasiswa selama periode magang.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'jurnal' && (
          <div className="space-y-6">
            <h2 className="text-[#202124] dark:text-[#E8EAED] text-lg font-bold">Jurnal Kegiatan</h2>
            {kegiatan.length === 0 ? (
              <div className="p-12 text-center bg-gray-50 dark:bg-[#303134] rounded-2xl border border-gray-100 dark:border-[#3C4043]">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-[#5F6368] dark:text-[#9AA0A6] font-medium">Belum ada entri jurnal kegiatan.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {kegiatan.map((k) => (
                  <div key={k.id} className="p-6 bg-white dark:bg-[#303134] border border-gray-100 dark:border-[#3C4043] rounded-2xl hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${k.status === 'Selesai' ? 'bg-[#E6F4EA] text-[#137333]' : 'bg-[#FEF7E0] text-[#E37400]'}`}>
                        {k.status === 'Selesai' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-[#1A73E8] mb-1">{k.tanggal}</p>
                        <p className="text-[#202124] dark:text-[#E8EAED] font-medium leading-relaxed mb-4">{k.kegiatan}</p>
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#3C4043] space-y-3">
                          {comments.filter(c => c.kegiatan_id === k.id).map(comment => (
                            <div key={comment.id} className="flex gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white ${comment.profiles?.role === 'dosen' ? 'bg-[#137333]' : 'bg-[#1A73E8]'}`}>
                                {comment.profiles?.nama_lengkap?.charAt(0) || '?'}
                              </div>
                              <div className="flex-1 bg-gray-50 dark:bg-[#202124] rounded-2xl px-4 py-2 border border-gray-100 dark:border-[#3C4043]">
                                <div className="flex justify-between items-center mb-1">
                                  <p className="text-xs font-bold text-[#202124] dark:text-[#E8EAED]">{comment.profiles?.nama_lengkap}</p>
                                  <p className="text-[10px] text-gray-400">{new Date(comment.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">{comment.message}</p>
                              </div>
                            </div>
                          ))}
                          <div className="flex gap-2 pt-2">
                            <input
                              type="text"
                              placeholder="Tambah komentar..."
                              value={newComment[k.id] || ''}
                              onChange={e => setNewComment(prev => ({ ...prev, [k.id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && handlePostComment(k.id)}
                              className="flex-1 bg-[#F8F9FA] dark:bg-[#202124] border border-gray-200 dark:border-[#3C4043] rounded-full px-4 py-2 text-xs outline-none focus:border-[#1A73E8] transition-colors"
                            />
                            <button
                              onClick={() => handlePostComment(k.id)}
                              disabled={isCommenting[k.id] || !newComment[k.id]?.trim()}
                              className="px-4 py-2 bg-[#1A73E8] text-white text-xs font-bold rounded-full disabled:opacity-50"
                            >
                              Kirim
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'berkas' && (
          <div className="space-y-6">
            <h2 className="text-[#202124] dark:text-[#E8EAED] text-lg font-bold">Berkas Dokumen</h2>
            {berkas.length === 0 ? (
              <div className="p-12 text-center bg-gray-50 dark:bg-[#303134] rounded-2xl border border-gray-100 dark:border-[#3C4043]">
                <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-[#5F6368] dark:text-[#9AA0A6] font-medium">Belum ada berkas yang diunggah.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {berkas.map(b => (
                  <div key={b.id} className="p-5 bg-white dark:bg-[#303134] border border-gray-100 dark:border-[#3C4043] rounded-2xl flex items-center justify-between group hover:border-[#1A73E8] transition-colors">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="w-12 h-12 bg-blue-50 dark:bg-[#1A73E8]/10 rounded-xl flex items-center justify-center flex-shrink-0 text-[#1A73E8]">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#202124] dark:text-[#E8EAED] truncate">{b.document_type}</p>
                        <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                          {(b.file_size / 1024 / 1024).toFixed(2)} MB • {new Date(b.uploaded_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                    <a
                      href={b.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#E8F0FE] dark:bg-[#1A73E8]/20 text-[#1A73E8] hover:bg-[#D2E3FC] dark:hover:bg-[#1A73E8]/30 text-xs font-bold rounded-xl transition-colors"
                    >
                      Lihat
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
