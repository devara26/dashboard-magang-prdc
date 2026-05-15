'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Calendar, FileText, CheckCircle2, Clock, FolderOpen, Activity, AlertCircle } from 'lucide-react'
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

  useEffect(() => {
    fetchData()
  }, [studentId])

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Sesi tidak ditemukan. Silakan login kembali.')

      // Fetch student profile and verify access
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .single()
      
      if (profileError) throw new Error('Gagal mengambil data profil mahasiswa.')
      if (profileData.dosen_id !== user.id) {
        toast.error('Akses ditolak. Mahasiswa ini tidak berada di bawah bimbingan Anda.')
        router.push('/dosen/mahasiswa')
        return
      }
      
      setProfile(profileData)

      // Fetch Absensi
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

      // Fetch Kegiatan
      if (profileData.nim) {
        const { data: kegiatanData, error: kegiatanError } = await supabase
          .from('Kegiatan')
          .select('*')
          .eq('nim', profileData.nim)
          .order('tanggal', { ascending: false })
        
        if (kegiatanError) throw new Error('Gagal mengambil data kegiatan mahasiswa.')
        setKegiatan(kegiatanData || [])
      }

      // Fetch Berkas
      const { data: berkasData, error: berkasError } = await supabase
        .from('berkas')
        .select('*')
        .eq('mahasiswa_id', studentId)
      
      if (berkasError) throw new Error('Gagal mengambil daftar berkas mahasiswa.')
      setBerkas(berkasData || [])

      // Fetch Comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*, profiles(nama_lengkap, role)')
        .in('kegiatan_id', kegiatanData?.map(k => k.id) || [])
        .order('created_at', { ascending: true })
      
      if (commentsError) console.error('Comments Fetch Error:', commentsError)
      setComments(commentsData as any || [])

    } catch (error: any) {
      toast.error(error.message || 'Gagal memuat detail mahasiswa. Silakan coba lagi.')
      console.error('Student View Error:', error)
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
      
      // Trigger Notification for Student
      await supabase.from('notifications').insert({
        user_id: studentId,
        message: `Dosen memberikan komentar pada jurnal Anda: "${message.substring(0, 30)}..."`,
        type: 'info',
        is_read: false
      })

      toast.success('Komentar berhasil dikirim')
    } catch (error: any) {
      toast.error('Gagal mengirim komentar: ' + error.message)
    } finally {
      setIsCommenting(prev => ({ ...prev, [kegiatanId]: false }))
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

  if (loading) {
    return (
      <div className="pb-8 animate-[fade-in_0.5s_ease-out] max-w-5xl mx-auto">
        <div className="mb-6"><div className="w-48 h-5 bg-gray-200 rounded animate-pulse"></div></div>
        <div className="flex gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse flex-shrink-0"></div>
          <div className="space-y-2 flex-1">
            <div className="w-1/3 h-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-1/4 h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="flex gap-2 border-b border-gray-200 mb-6">
          <div className="w-24 h-8 bg-gray-200 rounded-t animate-pulse"></div>
          <div className="w-24 h-8 bg-gray-200 rounded-t animate-pulse"></div>
          <div className="w-24 h-8 bg-gray-200 rounded-t animate-pulse"></div>
        </div>
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>
      </div>
    )
  }

  const totalHariTarget = profile?.tanggal_mulai && profile?.tanggal_selesai 
    ? getWorkDays(profile.tanggal_mulai, profile.tanggal_selesai) 
    : 150
  
  const progressPersen = totalHariTarget > 0 ? Math.min(Math.round((absensiStats.hadir / totalHariTarget) * 100), 100) : 0

  const tabs = [
    { id: 'ringkasan', label: 'Ringkasan', icon: Activity },
    { id: 'absensi', label: 'Absensi', icon: Calendar },
    { id: 'jurnal', label: 'Jurnal', icon: FileText },
    { id: 'berkas', label: 'Berkas', icon: FolderOpen },
  ] as const

  return (
    <div className="pb-12 animate-[fade-in_0.7s_ease-out] max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="mb-6">
        <Link href="/dosen/mahasiswa" className="inline-flex items-center text-sm font-medium text-[#5F6368] hover:text-[#1A73E8] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Kembali ke Daftar Mahasiswa
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

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? 'border-[#1A73E8] text-[#1A73E8]' 
                : 'border-transparent text-[#5F6368] hover:text-[#202124] hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 min-h-[400px]">
        
        {/* RINGKASAN TAB */}
        {activeTab === 'ringkasan' && (
          <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
            <h2 className="text-[#202124] text-lg font-bold">Profil Mahasiswa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-[#5F6368] font-bold uppercase tracking-wider mb-1">Instansi Magang</p>
                <p className="text-sm font-medium text-[#202124]">{profile?.instansi_magang || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-[#5F6368] font-bold uppercase tracking-wider mb-1">Unit / Divisi</p>
                <p className="text-sm font-medium text-[#202124]">{profile?.unit_magang || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-[#5F6368] font-bold uppercase tracking-wider mb-1">Periode Magang</p>
                <p className="text-sm font-medium text-[#202124]">
                  {profile?.tanggal_mulai || '?'} s/d {profile?.tanggal_selesai || '?'}
                </p>
              </div>
              <div className="p-4 bg-[#E8F0FE] border border-[#D2E3FC] rounded-xl">
                <p className="text-xs text-[#1A73E8] font-bold uppercase tracking-wider mb-1">Progress Kehadiran</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                    <div className="h-full bg-[#1A73E8]" style={{ width: `${progressPersen}%` }}></div>
                  </div>
                  <span className="text-sm font-bold text-[#1A73E8]">{progressPersen}%</span>
                </div>
              </div>
            </div>
            {profile?.bio && (
              <div>
                <p className="text-xs text-[#5F6368] font-bold uppercase tracking-wider mb-2">Bio & Catatan</p>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm text-[#202124] whitespace-pre-wrap">
                  {profile.bio}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABSENSI TAB */}
        {activeTab === 'absensi' && (
          <div className="animate-[fade-in_0.3s_ease-out]">
            <h2 className="text-[#202124] text-lg font-bold mb-4">Statistik Absensi</h2>
            {totalHariTarget > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#E6F4EA] rounded-2xl p-4 text-center border border-[#CEEAD6]">
                  <p className="text-[#137333] text-3xl font-black">{absensiStats.hadir}</p>
                  <p className="text-[#137333] text-xs font-bold uppercase mt-1">Hadir</p>
                </div>
                <div className="bg-[#FEF7E0] rounded-2xl p-4 text-center border border-[#FEEFC3]">
                  <p className="text-[#E37400] text-3xl font-black">{absensiStats.izin}</p>
                  <p className="text-[#E37400] text-xs font-bold uppercase mt-1">Izin</p>
                </div>
                <div className="bg-[#FCE8E6] rounded-2xl p-4 text-center border border-[#FAD2CF]">
                  <p className="text-[#C5221F] text-3xl font-black">{absensiStats.sakit}</p>
                  <p className="text-[#C5221F] text-xs font-bold uppercase mt-1">Sakit</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                  <p className="text-[#5F6368] text-3xl font-black">{absensiStats.alpha}</p>
                  <p className="text-[#5F6368] text-xs font-bold uppercase mt-1">Alpha</p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-100">
                <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-[#5F6368] text-sm">Belum ada data absensi atau periode magang belum diatur.</p>
              </div>
            )}
          </div>
        )}

        {/* JURNAL TAB */}
        {activeTab === 'jurnal' && (
          <div className="animate-[fade-in_0.3s_ease-out]">
            <h2 className="text-[#202124] text-lg font-bold mb-4">Jurnal Kegiatan</h2>
            {kegiatan.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-100">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-[#5F6368] text-sm">Mahasiswa belum mengisi jurnal kegiatan.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {kegiatan.map((k) => (
                  <div key={k.id} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.status === 'Selesai' ? 'bg-[#E6F4EA] text-[#137333]' : 'bg-[#FEF7E0] text-[#E37400]'}`}>
                        {k.status === 'Selesai' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[11px] font-bold text-[#1A73E8] mb-1">{k.tanggal}</p>
                            <p className="text-sm font-medium text-[#202124] leading-relaxed">{k.kegiatan}</p>
                            <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600">
                              Status: {k.status}
                            </span>
                          </div>
                        </div>

                        {/* Comment Thread */}
                        <div className="mt-4 pt-4 border-t border-gray-50 space-y-3">
                          {comments.filter(c => c.kegiatan_id === k.id).map(comment => (
                            <div key={comment.id} className="flex gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white ${comment.profiles?.role === 'dosen' ? 'bg-[#137333]' : 'bg-[#1A73E8]'}`}>
                                {comment.profiles?.nama_lengkap?.charAt(0) || '?'}
                              </div>
                              <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                                <div className="flex justify-between items-center mb-0.5">
                                  <p className="text-[10px] font-bold text-[#202124]">{comment.profiles?.nama_lengkap} <span className="font-normal text-gray-400">({comment.profiles?.role})</span></p>
                                  <p className="text-[9px] text-gray-400">{new Date(comment.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <p className="text-xs text-[#5F6368]">{comment.message}</p>
                              </div>
                            </div>
                          ))}

                          {/* Comment Input */}
                          <div className="flex gap-2 pt-2">
                            <input 
                              type="text" 
                              placeholder="Tambah komentar..."
                              value={newComment[k.id] || ''}
                              onChange={e => setNewComment(prev => ({ ...prev, [k.id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && handlePostComment(k.id)}
                              className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-1.5 text-xs outline-none focus:border-[#1A73E8] transition-colors"
                            />
                            <button 
                              onClick={() => handlePostComment(k.id)}
                              disabled={isCommenting[k.id] || !newComment[k.id]?.trim()}
                              className="px-4 py-1.5 bg-[#1A73E8] text-white text-xs font-bold rounded-full disabled:opacity-50 active:scale-95 transition-all"
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

        {/* BERKAS TAB */}
        {activeTab === 'berkas' && (
          <div className="animate-[fade-in_0.3s_ease-out]">
            <h2 className="text-[#202124] text-lg font-bold mb-4">Dokumen Berkas</h2>
            {berkas.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center">
                <FolderOpen className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-[#5F6368] text-sm font-medium">Belum ada berkas yang diunggah.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {berkas.map(b => (
                  <div key={b.id} className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between group hover:border-[#1A73E8] transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 text-[#1A73E8]">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#202124] truncate">{b.document_type}</p>
                        <p className="text-xs text-[#5F6368] truncate">
                          {new Date(b.uploaded_at).toLocaleDateString('id-ID')} • {(b.file_size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <a 
                      href={b.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#E8F0FE] text-[#1A73E8] hover:bg-[#D2E3FC] text-xs font-bold rounded-lg transition-colors flex-shrink-0"
                    >
                      Lihat File
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
