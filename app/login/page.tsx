'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<'mahasiswa' | 'dosen'>('mahasiswa')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email atau password salah. Silakan coba lagi.')
      setLoading(false)
    } else if (authData.user) {
      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: selectedRole })
          .eq('id', authData.user.id)
        
        if (updateError) {
          console.error('Gagal memperbarui role:', updateError)
        }
      } catch (err: any) {
        console.error('Exception saat memperbarui role:', err.message)
      }
      
      // Berhasil login, langsung redirect sesuai role pilihan terlepas dari error update DB
      window.location.href = selectedRole === 'dosen' ? '/dosen' : '/dashboard'
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="mb-4">
            <img src="/orbit-logo.svg" alt="Orbit Logo" className="h-12 w-auto object-contain" />
          </div>
          <h1 className="text-xl font-medium text-[#202124]">Online Record Base for Internship Tracking</h1>
          <p className="text-[#5F6368] text-sm mt-1">PRDC Team · Internship Program</p>
        </div>
        <form onSubmit={handleLogin} className="bg-white rounded-2xl p-8 space-y-6 border border-gray-200 shadow-sm">
          {error && (
            <div className="bg-[#FCE8E6] border border-[#FAD2CF] text-[#C5221F] text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#5F6368] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5F6368] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white text-[#202124] rounded-lg px-4 py-3 text-sm border border-gray-300 focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] transition-colors"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-sm font-medium text-[#5F6368] mb-3">Masuk sebagai:</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${selectedRole === 'mahasiswa' ? 'border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8]' : 'border-gray-200 text-[#5F6368] hover:border-gray-300 hover:bg-gray-50'}`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="mahasiswa" 
                  checked={selectedRole === 'mahasiswa'} 
                  onChange={() => setSelectedRole('mahasiswa')} 
                  className="hidden" 
                />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedRole === 'mahasiswa' ? 'border-[#1A73E8]' : 'border-gray-400'}`}>
                  {selectedRole === 'mahasiswa' && <div className="w-2 h-2 rounded-full bg-[#1A73E8]" />}
                </div>
                <span className="text-sm font-bold">Mahasiswa</span>
              </label>
              <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${selectedRole === 'dosen' ? 'border-[#137333] bg-[#E6F4EA] text-[#137333]' : 'border-gray-200 text-[#5F6368] hover:border-gray-300 hover:bg-gray-50'}`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="dosen" 
                  checked={selectedRole === 'dosen'} 
                  onChange={() => setSelectedRole('dosen')} 
                  className="hidden" 
                />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedRole === 'dosen' ? 'border-[#137333]' : 'border-gray-400'}`}>
                  {selectedRole === 'dosen' && <div className="w-2 h-2 rounded-full bg-[#137333]" />}
                </div>
                <span className="text-sm font-bold">Dosen Pembimbing</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1A73E8] hover:bg-[#1967D2] disabled:opacity-50 text-white rounded-xl py-3.5 text-sm font-bold transition-all active:scale-95 shadow-sm mt-2"
          >
            {loading ? 'Memproses...' : 'Log in'}
          </button>
          
          <p className="text-center text-[#5F6368] text-sm pt-2">
            Belum punya akun?{' '}
            <Link href="/register" className="text-[#1A73E8] hover:text-[#1967D2] font-bold">Daftar di sini</Link>
          </p>
        </form>
        <p className="text-center text-[#9AA0A6] text-xs mt-8">
          &copy; {new Date().getFullYear()} orbitprdc26
        </p>
      </div>
    </div>
  )
}
