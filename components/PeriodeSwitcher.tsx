'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  getActivePeriode, 
  switchPeriode, 
  checkMagang1Selesai, 
  PeriodeMagang 
} from '@/lib/periode'
import { 
  ChevronDown, 
  Calendar, 
  Lock, 
  Plus, 
  Check, 
  Loader2,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

export default function PeriodeSwitcher() {
  const router = useRouter()
  const [activePeriode, setActivePeriode] = useState<PeriodeMagang | null>(null)
  const [periodes, setPeriodes] = useState<PeriodeMagang[]>([])
  const [magang1Selesai, setMagang1Selesai] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function loadPeriodes() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        setUserId(user.id)

        // Ambil periode aktif
        const active = await getActivePeriode(supabase, user.id)
        setActivePeriode(active)

        // Ambil daftar semua periode
        const { data } = await supabase
          .from('periode_magang')
          .select('*')
          .eq('mahasiswa_id', user.id)
          .order('nomor_periode', { ascending: true })

        setPeriodes(data || [])

        // Cek apakah magang 1 selesai
        const selesai = await checkMagang1Selesai(supabase, user.id)
        setMagang1Selesai(selesai)
      } catch (err) {
        console.error('Error loading periods switcher:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPeriodes()

    // Setup listener untuk event klik di luar dropdown agar menutup otomatis
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.periode-switcher-container')) {
        setIsOpen(false)
      }
    }
    document.addEventListener('click', handleOutsideClick)
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [])

  const handleSwitch = async (periodeId: number) => {
    if (!userId || switching) return
    if (activePeriode?.id === periodeId) {
      setIsOpen(false)
      return
    }

    setSwitching(true)
    try {
      const success = await switchPeriode(supabase, userId, periodeId)
      if (success) {
        toast.success(`Berhasil berpindah ke periode magang ${periodeId === periodes.find(p => p.nomor_periode === 1)?.id ? '1' : '2'}`)
        setIsOpen(false)
        
        // Panggil router.refresh() dan reload window untuk reset state data fetching di client
        router.refresh()
        window.location.reload()
      } else {
        toast.error('Gagal berpindah periode magang')
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat berpindah periode')
    } finally {
      setSwitching(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-full border border-gray-100 text-xs font-semibold text-gray-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
        <span>Memuat Periode...</span>
      </div>
    )
  }

  // Cari apakah periode magang 2 sudah dibuat
  const hasPeriode2 = periodes.some(p => p.nomor_periode === 2)
  const isMagang1Active = activePeriode ? activePeriode.nomor_periode === 1 : true

  return (
    <div className="relative inline-block text-left periode-switcher-container">
      {/* Tombol Utama / Trigger Dropdown */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="flex items-center gap-2.5 px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-250 border-gray-200/80 rounded-full shadow-sm text-sm font-bold text-gray-800 transition-all active:scale-[0.98]"
      >
        <Calendar className="w-4 h-4 text-blue-500" />
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
          isMagang1Active 
            ? 'bg-blue-50 text-blue-600 border-blue-100' 
            : 'bg-purple-50 text-purple-650 border-purple-100'
        }`}>
          Magang {activePeriode ? activePeriode.nomor_periode : 1}
        </span>
        {activePeriode?.nama_instansi && (
          <span className="max-w-[100px] md:max-w-[140px] truncate text-gray-650 text-gray-700 text-xs font-semibold">
            {activePeriode.nama_instansi}
          </span>
        )}
        {switching ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Menu Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200/70 rounded-2xl shadow-xl z-50 p-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2 border-b border-gray-100 mb-2">
            <p className="text-[10px] font-bold text-gray-450 text-gray-400 uppercase tracking-widest">Pilih Periode Magang</p>
          </div>

          <div className="space-y-1">
            {periodes.map((p) => {
              const isActive = activePeriode?.id === p.id
              const isP1 = p.nomor_periode === 1
              return (
                <button
                  key={p.id}
                  onClick={() => handleSwitch(p.id)}
                  disabled={switching}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-left transition-all ${
                    isActive 
                      ? 'bg-blue-50/50 text-blue-600 font-bold border border-blue-100/50' 
                      : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                      isP1 
                        ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                        : 'bg-purple-50 text-purple-650 border border-purple-100'
                    }`}>
                      M{p.nomor_periode}
                    </span>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold leading-none truncate max-w-[150px]">{p.nama_instansi}</p>
                      <p className="text-[10px] text-gray-450 text-gray-400 mt-1 capitalize leading-none font-medium">{p.status === 'selesai' ? 'Selesai' : 'Aktif'}</p>
                    </div>
                  </div>
                  {isActive && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              )
            })}

            {/* Opsi Magang 2 jika belum dibuat */}
            {!hasPeriode2 && (
              <div className="relative group w-full mt-2 pt-2 border-t border-gray-100">
                {magang1Selesai ? (
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      router.push('/dashboard/setup-magang-2')
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Mulai Magang 2</span>
                  </button>
                ) : (
                  <div className="w-full">
                    {/* disabled button */}
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-gray-100 text-gray-400 rounded-xl font-bold text-xs border border-gray-200 cursor-not-allowed opacity-75"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Mulai Magang 2</span>
                    </button>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50 w-60">
                      <div className="bg-slate-900 text-white text-[10px] font-bold py-2 px-3 rounded-lg shadow-lg flex items-center gap-1.5 border border-slate-700 text-center">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Selesaikan Magang 1 Terlebih Dahulu</span>
                      </div>
                      <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 -mt-1.5 border-r border-b border-slate-700"></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
