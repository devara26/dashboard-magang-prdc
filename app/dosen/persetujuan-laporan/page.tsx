'use client'

import { CheckSquare } from 'lucide-react'

export default function PersetujuanPage() {
  return (
    <div className="pb-8 animate-[fade-in_0.7s_ease-out]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#202124] flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-[#1A73E8]" />
          Persetujuan Jurnal
        </h1>
        <p className="text-[#5F6368] text-sm mt-1">Review dan setujui jurnal kegiatan mahasiswa</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
        <p className="text-[#5F6368]">Fitur persetujuan jurnal massal sedang dalam pengembangan.</p>
      </div>
    </div>
  )
}
