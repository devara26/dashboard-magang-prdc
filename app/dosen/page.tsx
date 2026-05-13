'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, ChevronRight, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Mahasiswa = {
  id: string
  nama_lengkap: string
  nim: string
  prodi: string
  instansi_magang: string
}

export default function DosenPage() {
  const router = useRouter()
  const [mahasiswa, setMahasiswa] = useState<Mahasiswa[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchMahasiswa() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nama_lengkap, nim, prodi, instansi_magang')
          .eq('role', 'mahasiswa')
          .order('nama_lengkap', { ascending: true })

        if (error) throw error

        setMahasiswa(data || [])
      } catch (error: any) {
        toast.error('Gagal memuat daftar mahasiswa: ' + error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchMahasiswa()
  }, [])

  const filteredMahasiswa = mahasiswa.filter(m => 
    m.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) || 
    m.nim?.toLowerCase().includes(search.toLowerCase()) ||
    m.instansi_magang?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1A73E8] rounded-full animate-spin"></div>
        <p className="text-[#5F6368] text-sm font-medium animate-pulse">Memuat daftar mahasiswa...</p>
      </div>
    </div>
  )

  return (
    <div className="pb-8 animate-[fade-in_0.7s_ease-out] max-w-lg mx-auto md:max-w-none">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#202124]">Daftar Mahasiswa</h1>
        <p className="text-[#5F6368] text-sm mt-1">Pantau kemajuan mahasiswa magang</p>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama, NIM, atau instansi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#F8F9FA] border-transparent rounded-xl text-sm focus:bg-white focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-[24px] shadow-sm border border-gray-50 overflow-hidden">
        {filteredMahasiswa.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
              <User className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-[#5F6368] text-sm font-medium">Tidak ada mahasiswa ditemukan</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredMahasiswa.map((m) => (
              <div 
                key={m.id} 
                onClick={() => router.push(`/dosen/mahasiswa/${m.id}`)}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center font-bold flex-shrink-0">
                    {m.nama_lengkap?.charAt(0).toUpperCase() || 'M'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#202124]">{m.nama_lengkap}</p>
                    <p className="text-[11px] font-medium text-[#9AA0A6] mt-0.5">
                      {m.nim} • {m.instansi_magang || 'Belum ada instansi'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#1A73E8] transition-colors" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
