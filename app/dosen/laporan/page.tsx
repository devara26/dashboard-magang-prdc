'use client'

import { FileText } from 'lucide-react'

export default function LaporanPage() {
  return (
    <div className="pb-8 animate-[fade-in_0.7s_ease-out]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#202124] flex items-center gap-2">
          <FileText className="w-6 h-6 text-[#1A73E8]" />
          Laporan Akhir
        </h1>
        <p className="text-[#5F6368] text-sm mt-1">Pantau dan nilai laporan akhir magang mahasiswa</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
        <p className="text-[#5F6368]">Fitur pengelolaan laporan sedang dalam pengembangan.</p>
      </div>
    </div>
  )
}
