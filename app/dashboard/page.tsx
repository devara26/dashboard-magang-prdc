export default function DashboardPage() {
  const stats = [
    { label: 'Total Hari Magang', value: '150', sub: 'dari 150 hari' },
    { label: 'Kehadiran', value: '142', sub: '94.6% hadir' },
    { label: 'Tugas Selesai', value: '28', sub: 'dari 30 tugas' },
    { label: 'Dokumentasi', value: '47', sub: 'file tersimpan' },
  ]

  const kegiatan = [
    { tanggal: '22 Apr 2025', kegiatan: 'Dokumentasi rapat PKS KKP-POLRI', status: 'Selesai' },
    { tanggal: '21 Apr 2025', kegiatan: 'Pembuatan konten media sosial BPPMHKP', status: 'Selesai' },
    { tanggal: '20 Apr 2025', kegiatan: 'Liputan kegiatan program MBG', status: 'Selesai' },
    { tanggal: '19 Apr 2025', kegiatan: 'Penulisan press release', status: 'Selesai' },
    { tanggal: '18 Apr 2025', kegiatan: 'Koordinasi tim Humas', status: 'Selesai' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Dashboard Monitoring Magang</h1>
        <p className="text-gray-400 text-sm mt-1">Divisi Kerja Sama dan Humas · BPPMHKP KKP RI</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-gray-400 text-xs mb-2">{s.label}</p>
            <p className="text-white text-3xl font-semibold">{s.value}</p>
            <p className="text-gray-500 text-xs mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-8">
        <div className="flex justify-between items-center mb-3">
          <p className="text-white text-sm font-medium">Progress Magang</p>
          <p className="text-blue-400 text-sm">100%</p>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
        </div>
        <p className="text-gray-500 text-xs mt-2">November 2024 — April 2025</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white text-sm font-medium mb-4">Kegiatan Terbaru</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs border-b border-gray-800">
              <th className="text-left pb-3">Tanggal</th>
              <th className="text-left pb-3">Kegiatan</th>
              <th className="text-left pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {kegiatan.map(k => (
              <tr key={k.tanggal}>
                <td className="py-3 text-gray-400 whitespace-nowrap">{k.tanggal}</td>
                <td className="py-3 text-white pr-4">{k.kegiatan}</td>
                <td className="py-3">
                  <span className="bg-green-900 text-green-400 text-xs px-2 py-1 rounded-full">
                    {k.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}