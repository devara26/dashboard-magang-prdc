'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [role, setRole] = useState<'mahasiswa' | 'dosen'>('mahasiswa')
  const [form, setForm] = useState({
    nama_lengkap: '',
    nim: '', // or NIDN for dosen
    email: '',
    password: '',
    prodi: '', // mahasiswa
    instansi_magang: '', // mahasiswa
    unit_magang: '', // mahasiswa
    fakultas: '', // dosen
    mata_kuliah: '', // dosen
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Data yang di-upsert bergantung pada role
      const profileData: any = {
        id: data.user.id,
        email: form.email,
        nama_lengkap: form.nama_lengkap,
        role: role,
      }

      if (role === 'mahasiswa') {
        profileData.nim = form.nim
        profileData.prodi = form.prodi
        profileData.instansi_magang = form.instansi_magang
        profileData.unit_magang = form.unit_magang
      } else {
        profileData.nim = form.nim // Menggunakan kolom nim untuk menyimpan NIDN agar struktur tidak banyak berubah jika belum ada kolom nidn. Tetapi lebih baik pakai nidn jika sudah di set. Kita kirim 'nidn' saja.
        profileData.nidn = form.nim // Set ke nidn
        profileData.fakultas = form.fakultas
        profileData.mata_kuliah = form.mata_kuliah
      }

      const { error: profileError } = await supabase.from('profiles').upsert(profileData)

      if (profileError) {
        setError('Akun dibuat tapi profil gagal disimpan: ' + profileError.message)
        setLoading(false)
        return
      }

      // Redirect sesuai role
      router.push(role === 'mahasiswa' ? '/dashboard' : '/dosen')
      router.refresh()
    }
  }

  const mahasiswaFields = [
    { name: 'nama_lengkap', label: 'Nama Lengkap', type: 'text', placeholder: 'John Doe' },
    { name: 'nim', label: 'NIM', type: 'text', placeholder: 'Nomor Induk Mahasiswa' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'nama@email.com' },
    { name: 'password', label: 'Password', type: 'password', placeholder: 'Min. 6 karakter' },
    { name: 'prodi', label: 'Program Studi', type: 'text', placeholder: 'Nama Program Studi' },
    { name: 'instansi_magang', label: 'Instansi Magang', type: 'text', placeholder: 'Nama Instansi Magang' },
    { name: 'unit_magang', label: 'Unit/Divisi', type: 'text', placeholder: 'Nama Unit atau Divisi' },
  ]

  const dosenFields = [
    { name: 'nama_lengkap', label: 'Nama Lengkap', type: 'text', placeholder: 'Dr. John Doe' },
    { name: 'nim', label: 'NIDN', type: 'text', placeholder: 'Nomor Induk Dosen Nasional' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'nama@email.com' },
    { name: 'password', label: 'Password', type: 'password', placeholder: 'Min. 6 karakter' },
    { name: 'fakultas', label: 'Fakultas', type: 'text', placeholder: 'Nama Fakultas' },
    { name: 'mata_kuliah', label: 'Mata Kuliah Diampu', type: 'text', placeholder: 'Nama Mata Kuliah' },
  ]

  const activeFields = role === 'mahasiswa' ? mahasiswaFields : dosenFields

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="mb-4">
            <img src="/orbit-logo.svg" alt="Orbit Logo" className="h-12 w-auto object-contain" />
          </div>
          <h1 className="text-xl font-medium text-[#202124]">Online Record Base for Internship Tracking</h1>
          <p className="text-[#5F6368] text-sm mt-1">Daftar Akun · PRDC Team</p>
        </div>
        <form onSubmit={handleRegister} className="bg-white rounded-2xl p-8 space-y-4 border border-gray-200 shadow-sm">
          {error && (
            <div className="bg-[#FCE8E6] border border-[#FAD2CF] text-[#C5221F] text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Role Selection */}
          <div className="flex gap-2 p-1 bg-[#F1F3F4] rounded-lg mb-6">
            <button
              type="button"
              onClick={() => setRole('mahasiswa')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                role === 'mahasiswa' ? 'bg-white text-[#202124] shadow-sm' : 'text-[#5F6368] hover:text-[#202124]'
              }`}
            >
              Mahasiswa
            </button>
            <button
              type="button"
              onClick={() => setRole('dosen')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                role === 'dosen' ? 'bg-white text-[#202124] shadow-sm' : 'text-[#5F6368] hover:text-[#202124]'
              }`}
            >
              Dosen
            </button>
          </div>

          {activeFields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-[#5F6368] mb-1.5">{field.label}</label>
              <input
                type={field.type}
                name={field.name}
                value={form[field.name as keyof typeof form]}
                onChange={handleChange}
                placeholder={field.placeholder}
                required
                className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1A73E8] hover:bg-[#1967D2] disabled:opacity-50 text-white rounded-lg py-3 text-sm font-medium transition-colors mt-6 active:scale-95"
          >
            {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
          </button>
          <p className="text-center text-[#5F6368] text-sm pt-2">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-[#1A73E8] hover:text-[#1967D2] font-medium">Masuk di sini</Link>
          </p>
        </form>
        <p className="text-center text-[#9AA0A6] text-xs mt-8">
          &copy; {new Date().getFullYear()} orbitprdc26
        </p>
      </div>
    </div>
  )
}
