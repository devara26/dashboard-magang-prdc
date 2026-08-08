'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { checkMagang1Selesai, createPeriode2 } from '@/lib/periode'
import { 
  Building, 
  Calendar, 
  Users, 
  ArrowLeft, 
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Rocket
} from 'lucide-react'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'

export default function SetupMagang2Page() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [magang1Selesai, setMagang1Selesai] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [dosenList, setDosenList] = useState<any[]>([])

  // Form State
  const [form, setForm] = useState({
    nama_instansi: '',
    jenis_instansi: 'swasta',
    unit_divisi: '',
    dosen_id: '',
    tanggal_mulai: ''
  })

  useEffect(() => {
    async function initialize() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        setUserId(user.id)

        // Cek apakah Magang 1 sudah selesai
        const selesai = await checkMagang1Selesai(supabase, user.id)
        setMagang1Selesai(selesai)

        if (selesai) {
          // Ambil daftar dosen
          const { data: dosenData, error: dosenErr } = await supabase
            .from('profiles')
            .select('id, nama_lengkap')
            .eq('role', 'dosen')
            .order('nama_lengkap', { ascending: true })

          if (dosenErr) {
            console.error('Error fetching dosen list:', dosenErr)
          } else {
            setDosenList(dosenData || [])
          }
        }
      } catch (err) {
        console.error('Error initializing Setup Magang 2:', err)
      } finally {
        setChecking(false)
      }
    }

    initialize()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || submitting) return

    if (!form.nama_instansi.trim() || !form.unit_divisi.trim() || !form.dosen_id || !form.tanggal_mulai) {
      toast.error('Semua kolom form harus dilengkapi!')
      return
    }

    setSubmitting(true)
    try {
      await createPeriode2(supabase, userId, {
        nama_instansi: form.nama_instansi,
        jenis_instansi: form.jenis_instansi,
        unit_divisi: form.unit_divisi,
        dosen_id: form.dosen_id,
        tanggal_mulai: form.tanggal_mulai
      })

      toast.success('Pendaftaran Magang 2 Berhasil! Mempersiapkan dashboard baru Anda...')
      router.push('/dashboard')
      // Pemicu reload agar state di layout ikut ter-refresh dengan benar
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (err: any) {
      toast.error(err.message || 'Gagal mendaftarkan Magang 2')
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto shadow-sm" />
          <p className="text-gray-500 font-bold text-sm tracking-tight animate-pulse">Menghubungkan Ke Pusat Orbit...</p>
        </div>
      </div>
    )
  }

  // Jika Magang 1 belum selesai, tampilkan pesan warning & link berkas
  if (!magang1Selesai) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl border border-gray-200/80 p-8 md:p-12 text-center space-y-8 shadow-sm">
          <div className="w-20 h-20 bg-amber-50 rounded-[32px] flex items-center justify-center mx-auto text-amber-500 shadow-inner">
            <AlertTriangle size={40} />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">Magang 1 Belum Selesai</h2>
            <p className="text-gray-555 text-gray-600 text-sm leading-relaxed max-w-md mx-auto">
              Sesuai aturan akademik, Anda hanya dapat mendaftarkan dan memulai **Magang 2** setelah **Magang 1** dinyatakan selesai (Laporan Akhir diverifikasi oleh Dosen Pembimbing).
            </p>
          </div>
          <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-start gap-3 max-w-md mx-auto text-left">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-semibold leading-relaxed">
              Silakan unggah dokumen Laporan Akhir pada tab Berkas Saya dan koordinasikan dengan dosen pembimbing Anda untuk memverifikasi dokumen tersebut.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link 
              href="/dashboard"
              className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-sm transition-all"
            >
              Kembali ke Dashboard
            </Link>
            <Link 
              href="/dashboard/berkas"
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-blue-100"
            >
              Ke Halaman Berkas
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Tombol Kembali */}
      <Link 
        href="/dashboard" 
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-800 mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        KEMBALI KE DASHBOARD
      </Link>

      <div className="bg-white rounded-3xl border border-gray-200/80 p-8 md:p-12 shadow-sm space-y-10">
        {/* Header Setup */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-purple-50 text-purple-650 text-[10px] font-extrabold uppercase tracking-wider rounded-full border border-purple-100">
                Langkah Lanjutan
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Mulai Magang Periode 2</h1>
            <p className="text-gray-500 text-sm font-medium">Lengkapi formulir pendaftaran di bawah untuk membuat penempatan Magang 2.</p>
          </div>
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 shrink-0 shadow-inner">
            <Rocket size={32} />
          </div>
        </div>

        {/* Form Registration */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Nama Instansi */}
            <div className="space-y-2.5 col-span-2">
              <label className="text-xs font-extrabold text-gray-700 flex items-center gap-2 uppercase tracking-wide">
                <Building size={15} className="text-purple-600" />
                Nama Instansi / Perusahaan
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: PT. Digital Solusindo"
                value={form.nama_instansi}
                onChange={e => setForm({ ...form, nama_instansi: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200/80 rounded-2xl px-5 py-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-purple-100 focus:bg-white focus:border-purple-400 transition-all shadow-inner text-gray-800"
              />
            </div>

            {/* Jenis Instansi */}
            <div className="space-y-2.5">
              <label className="text-xs font-extrabold text-gray-700 flex items-center gap-2 uppercase tracking-wide">
                <Building size={15} className="text-purple-600" />
                Jenis Instansi
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, jenis_instansi: 'swasta' })}
                  className={`py-3.5 rounded-2xl font-bold text-sm border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    form.jenis_instansi === 'swasta'
                      ? 'bg-purple-50 text-purple-700 border-purple-300 shadow-sm'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Swasta
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, jenis_instansi: 'pemerintah' })}
                  className={`py-3.5 rounded-2xl font-bold text-sm border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    form.jenis_instansi === 'pemerintah'
                      ? 'bg-purple-50 text-purple-700 border-purple-300 shadow-sm'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Pemerintah
                </button>
              </div>
            </div>

            {/* Unit / Divisi */}
            <div className="space-y-2.5">
              <label className="text-xs font-extrabold text-gray-700 flex items-center gap-2 uppercase tracking-wide">
                <Building size={15} className="text-purple-600" />
                Unit / Divisi Kerja
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Divisi IT / Marketing"
                value={form.unit_divisi}
                onChange={e => setForm({ ...form, unit_divisi: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200/80 rounded-2xl px-5 py-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-purple-100 focus:bg-white focus:border-purple-400 transition-all shadow-inner text-gray-800"
              />
            </div>

            {/* Dosen Pembimbing */}
            <div className="space-y-2.5">
              <label className="text-xs font-extrabold text-gray-700 flex items-center gap-2 uppercase tracking-wide">
                <Users size={15} className="text-purple-600" />
                Dosen Pembimbing
              </label>
              <select
                required
                value={form.dosen_id}
                onChange={e => setForm({ ...form, dosen_id: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200/80 rounded-2xl px-5 py-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-purple-100 focus:bg-white focus:border-purple-400 transition-all shadow-inner text-gray-800 appearance-none cursor-pointer"
              >
                <option value="">Pilih Dosen Pembimbing...</option>
                {dosenList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nama_lengkap}
                  </option>
                ))}
              </select>
            </div>

            {/* Tanggal Mulai */}
            <div className="space-y-2.5">
              <label className="text-xs font-extrabold text-gray-700 flex items-center gap-2 uppercase tracking-wide">
                <Calendar size={15} className="text-purple-600" />
                Tanggal Mulai Magang 2
              </label>
              <input
                type="date"
                required
                value={form.tanggal_mulai}
                onChange={e => setForm({ ...form, tanggal_mulai: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200/80 rounded-2xl px-5 py-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-purple-100 focus:bg-white focus:border-purple-400 transition-all shadow-inner text-gray-800"
              />
            </div>

          </div>

          {/* Catatan Info */}
          <div className="p-5 bg-purple-50/40 border border-purple-100 rounded-2xl flex items-start gap-3">
            <CheckCircle2 size={18} className="text-purple-600 shrink-0 mt-0.5" />
            <p className="text-xs text-purple-800 font-semibold leading-relaxed">
              Dengan mengklik 'Aktifkan Magang 2', sistem akan membuat periode penempatan baru. Sesi dashboard Anda akan dialihkan secara otomatis ke periode yang baru ini. Anda tetap dapat beralih kembali ke Magang 1 sewaktu-waktu melalui tombol switcher di bagian header.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-5 bg-gradient-to-r from-purple-650 to-indigo-600 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl label-orbit font-bold uppercase tracking-widest shadow-xl shadow-purple-100 disabled:opacity-50 transition-all active:scale-[0.98] cursor-pointer text-center flex items-center justify-center gap-2 text-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>Mendaftarkan Magang 2...</span>
              </>
            ) : (
              <span>Aktifkan Magang 2</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
