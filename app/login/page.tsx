'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email atau password salah. Silakan coba lagi.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="mb-4">
            <img src="/orbit-logo.png" alt="Orbit Logo" className="h-12 w-auto object-contain" />
          </div>
          <h1 className="text-xl font-medium text-[#202124]">Online Record Base for Internship Tracking</h1>
          <p className="text-[#5F6368] text-sm mt-1">BPPMHKP · KKP RI</p>
        </div>
        <form onSubmit={handleLogin} className="bg-white rounded-2xl p-8 space-y-5 border border-gray-200 shadow-sm">
          {error && (
            <div className="bg-[#FCE8E6] border border-[#FAD2CF] text-[#C5221F] text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
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
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1A73E8] hover:bg-[#1967D2] disabled:opacity-50 text-white rounded-lg py-3 text-sm font-medium transition-colors active:scale-95"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
          <p className="text-center text-[#5F6368] text-sm pt-2">
            Belum punya akun?{' '}
            <Link href="/register" className="text-[#1A73E8] hover:text-[#1967D2] font-medium">Daftar di sini</Link>
          </p>
        </form>
        <p className="text-center text-[#9AA0A6] text-xs mt-8">
          &copy; {new Date().getFullYear()} orbitprdc26 · Devara Alfarizi Wiraka
        </p>
      </div>
    </div>
  )
}