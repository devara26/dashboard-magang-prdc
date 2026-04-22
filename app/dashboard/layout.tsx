export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col px-4 py-6">
        <div className="mb-8">
          <h2 className="text-white font-semibold text-sm">Platform Magang</h2>
          <p className="text-gray-500 text-xs mt-0.5">BPPMHKP · KKP RI</p>
        </div>
        <nav className="space-y-1 flex-1">
          <a href="/dashboard" className="block px-3 py-2 rounded-lg text-sm text-white bg-gray-800">Dashboard</a>
          <a href="/dashboard/kegiatan" className="block px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800">Kegiatan Harian</a>
          <a href="/dashboard/absensi" className="block px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800">Absensi</a>
          <a href="/dashboard/tugas" className="block px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800">Tugas</a>
          <a href="/dashboard/dokumentasi" className="block px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800">Dokumentasi</a>
        </nav>
        <div className="border-t border-gray-800 pt-4">
          <p className="text-xs text-gray-500">Devara Alfarizi W.</p>
          <p className="text-xs text-gray-600">Semester 6 · D-IV Humas</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}