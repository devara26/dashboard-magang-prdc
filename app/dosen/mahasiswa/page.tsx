'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, User, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

type Mahasiswa = {
  id: string
  nama_lengkap: string
  nim: string
  prodi: string
  instansi_magang: string
  tanggal_mulai: string | null
  tanggal_selesai: string | null
  progress: number
}

export default function DaftarMahasiswaPage() {
  const router = useRouter()
  const [mahasiswa, setMahasiswa] = useState<Mahasiswa[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: mhsData, error } = await supabase
          .from('profiles')
          .select('id, nama_lengkap, nim, prodi, instansi_magang, tanggal_mulai, tanggal_selesai')
          .eq('role', 'mahasiswa')
          .order('nama_lengkap', { ascending: true })

        if (error) throw error

        const { data: absensiData } = await supabase.from('absensi').select('mahasiswa_id, status')

        const mhsList = (mhsData || []).map(m => {
          const hadir = absensiData?.filter(a => a.mahasiswa_id === m.id && a.status === 'Hadir').length || 0
          const start = m.tanggal_mulai ? new Date(m.tanggal_mulai) : null
          const end = m.tanggal_selesai ? new Date(m.tanggal_selesai) : null
          
          let target = 150
          if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
            target = 0
            let current = new Date(start)
            while (current <= end) {
              const day = current.getDay()
              if (day !== 0 && day !== 6) target++
              current.setDate(current.getDate() + 1)
            }
          }
          
          const progress = target > 0 ? Math.min(Math.round((hadir / target) * 100), 100) : 0

          return {
            ...m,
            progress
          }
        })

        setMahasiswa(mhsList)
      } catch (error: any) {
        toast.error('Gagal memuat daftar mahasiswa: ' + error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filteredMahasiswa = mahasiswa.filter(m => 
    m.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) || 
    m.nim?.toLowerCase().includes(search.toLowerCase()) ||
    m.instansi_magang?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#137333] rounded-full animate-spin"></div>
        <p className="text-[#5F6368] text-sm font-medium animate-pulse">Memuat daftar mahasiswa...</p>
      </div>
    </div>
  )

  return (
    <div className="pb-8 animate-[fade-in_0.7s_ease-out] max-w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#202124]">Daftar Mahasiswa Monitoring</h1>
        <p className="text-[#5F6368] text-sm mt-1">Pantau kemajuan dan kelengkapan jurnal harian mahasiswa.</p>
      </div>

      <div className="bg-white p-4 rounded-t-2xl border border-gray-200 border-b-0 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, NIM, atau instansi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#F8F9FA] border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-[#137333] focus:ring-1 focus:ring-[#137333] transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-b-2xl shadow-sm border border-gray-200 overflow-x-auto">
        {filteredMahasiswa.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center border-t border-gray-100">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
              <User className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-[#5F6368] text-sm font-medium">Tidak ada mahasiswa ditemukan</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#F8F9FA] text-[#5F6368] font-medium border-y border-gray-200">
              <tr>
                <th className="px-6 py-3">Nama Mahasiswa</th>
                <th className="px-6 py-3">NIM</th>
                <th className="px-6 py-3">Instansi Magang</th>
                <th className="px-6 py-3">Progress %</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMahasiswa.map((m) => (
                <tr key={m.id} className="hover:bg-[#F8F9FA] transition-colors group">
                  <td className="px-6 py-3">
                    <p className="font-bold text-[#202124]">{m.nama_lengkap}</p>
                  </td>
                  <td className="px-6 py-3 text-[#5F6368]">
                    {m.nim}
                  </td>
                  <td className="px-6 py-3 text-[#5F6368] truncate max-w-[200px]" title={m.instansi_magang}>
                    {m.instansi_magang || '-'}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${m.progress >= 80 ? 'bg-[#137333]' : m.progress >= 50 ? 'bg-[#FBBC04]' : 'bg-[#EA4335]'}`} 
                          style={{ width: `${m.progress}%` }}
                        />
                      </div>
                      <span className="font-medium text-[#202124] text-xs w-8">{m.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Link 
                      href={`/dosen/monitor/${m.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E6F4EA] text-[#137333] hover:bg-[#CEEAD6] rounded-md text-xs font-bold transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Lihat Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
