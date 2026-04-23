'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nama_lengkap: '',
    nim: '',
    email: '',
    password: '',
    prodi: '',
    instansi_magang: '',
    unit_magang: '',
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
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email: form.email,
        nama_lengkap: form.nama_lengkap,
        nim: form.nim,
        prodi: form.prodi,
        instansi_magang: form.instansi_magang,
        unit_magang: form.unit_magang,
        role: 'mahasiswa',
      })

      if (profileError) {
        setError('Akun dibuat tapi profil gagal disimpan: ' + profileError.message)
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Daftar Akun</h1>
          <p className="text-gray-400 text-sm mt-1">Platform Magang · BPPMHKP KKP RI</p>
        </div>
        <form onSubmit={handleRegister} className="bg-gray-900 rounded-2xl p-8 space-y-4 border border-gray-800">
          {error && (
            <div className="bg-red-900/50 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {[
            { name: 'nama_lengkap', label: 'Nama Lengkap', type: 'text', placeholder: 'Devara Alfarizi Wiraka' },
            { name: 'nim', label: 'NIM', type: 'text', placeholder: '1414423027' },
            { name: 'email', label: 'Email', type: 'email', placeholder: 'nama@email.com' },
            { name: 'password', label: 'Password', type: 'password', placeholder: 'Min. 6 karakter' },
            { name: 'prodi', label: 'Program Studi', type: 'text', placeholder: 'D-IV Hubungan Masyarakat' },
            { name: 'instansi_magang', label: 'Instansi Magang', type: 'text', placeholder: 'BPPMHKP KKP RI' },
            { name: 'unit_magang', label: 'Unit/Divisi', type: 'text', placeholder: 'Divisi Kerja Sama dan Humas' },
          ].map(field => (
            <div key={field.name}>
              <label className="block text-sm text-gray-400 mb-1">{field.label}</label>
              <input
                type={field.type}
                name={field.name}
                value={form[field.name as keyof typeof form]}
                onChange={handleChange}
                placeholder={field.placeholder}
                required
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-3 text-sm font-medium transition-colors mt-2"
          >
            {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
          </button>
          <p className="text-center text-gray-500 text-sm">
            Sudah punya akun?{' '}
            <a href="/login" className="text-blue-400 hover:text-blue-300">Masuk di sini</a>
          </p>
        </form>
      </div>
    </div>
  )
}