'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Building, Calendar, CheckCircle2, ChevronRight, ChevronLeft, Rocket, Info } from 'lucide-react'
import { toast } from 'sonner'

interface OnboardingWizardProps {
  onComplete: () => void
  userId: string
}

export default function OnboardingWizard({ onComplete, userId }: OnboardingWizardProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nim: '',
    prodi: '',
    instansi_magang: '',
    unit_magang: '',
    tanggal_mulai: '',
    tanggal_selesai: ''
  })

  const totalSteps = 4

  const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps))
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1))

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...form,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      toast.success('Profil berhasil dilengkapi! Selamat datang di ORBIT.')
      onComplete()
    } catch (error: any) {
      toast.error('Gagal menyimpan profil: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fade-in_0.3s_ease-out]">
      <div className="bg-white dark:bg-[#202124] w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden relative border border-gray-100 dark:border-[#3C4043]">
        
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-gray-100 dark:bg-[#303134]">
          <div 
            className="h-full bg-[#1A73E8] transition-all duration-500 ease-out" 
            style={{ width: `${(step / totalSteps) * 100}%` }}
          ></div>
        </div>

        <div className="p-8">
          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <div className="text-center animate-[fade-in_0.3s_ease-out]">
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[#1A73E8]">
                <Rocket className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-extrabold text-[#202124] dark:text-[#E8EAED] mb-3">Selamat Datang!</h2>
              <p className="text-[#5F6368] dark:text-[#9AA0A6] text-sm leading-relaxed mb-8">
                ORBIT akan membantu Anda memantau kegiatan magang dengan lebih mudah. Mari lengkapi profil Anda terlebih dahulu.
              </p>
              <button 
                onClick={nextStep}
                className="w-full py-4 bg-[#1A73E8] text-white rounded-2xl font-bold hover:bg-[#1967D2] transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Mulai Sekarang <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* STEP 2: AKADEMIK */}
          {step === 2 && (
            <div className="animate-[fade-in_0.3s_ease-out]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#E8F0FE] dark:bg-[#1A73E8]/10 rounded-xl flex items-center justify-center text-[#1A73E8]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#202124] dark:text-[#E8EAED]">Data Akademik</h3>
                  <p className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] uppercase font-bold tracking-wider">Langkah 2 dari 4</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-2 uppercase tracking-wide">Nomor Induk Mahasiswa (NIM)</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: 21010123"
                    value={form.nim}
                    onChange={e => setForm({...form, nim: e.target.value})}
                    className="w-full bg-[#F8F9FA] dark:bg-[#303134] border border-gray-200 dark:border-[#3C4043] rounded-xl px-4 py-3 text-sm focus:border-[#1A73E8] outline-none text-[#202124] dark:text-[#E8EAED]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-2 uppercase tracking-wide">Program Studi</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Teknik Informatika"
                    value={form.prodi}
                    onChange={e => setForm({...form, prodi: e.target.value})}
                    className="w-full bg-[#F8F9FA] dark:bg-[#303134] border border-gray-200 dark:border-[#3C4043] rounded-xl px-4 py-3 text-sm focus:border-[#1A73E8] outline-none text-[#202124] dark:text-[#E8EAED]"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={prevStep} className="flex-1 py-3 border border-gray-200 dark:border-[#3C4043] text-[#5F6368] dark:text-[#9AA0A6] rounded-xl font-bold text-sm">Kembali</button>
                <button 
                  onClick={nextStep} 
                  disabled={!form.nim || !form.prodi}
                  className="flex-[2] py-3 bg-[#1A73E8] text-white rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  Lanjut
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: MAGANG */}
          {step === 3 && (
            <div className="animate-[fade-in_0.3s_ease-out]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#FEF7E0] dark:bg-[#FBBC04]/10 rounded-xl flex items-center justify-center text-[#FBBC04]">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#202124] dark:text-[#E8EAED]">Lokasi Magang</h3>
                  <p className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] uppercase font-bold tracking-wider">Langkah 3 dari 4</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-2 uppercase tracking-wide">Instansi / Perusahaan</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: PT. Teknologi Maju"
                    value={form.instansi_magang}
                    onChange={e => setForm({...form, instansi_magang: e.target.value})}
                    className="w-full bg-[#F8F9FA] dark:bg-[#303134] border border-gray-200 dark:border-[#3C4043] rounded-xl px-4 py-3 text-sm focus:border-[#1A73E8] outline-none text-[#202124] dark:text-[#E8EAED]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-2 uppercase tracking-wide">Unit / Divisi</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Software Development"
                    value={form.unit_magang}
                    onChange={e => setForm({...form, unit_magang: e.target.value})}
                    className="w-full bg-[#F8F9FA] dark:bg-[#303134] border border-gray-200 dark:border-[#3C4043] rounded-xl px-4 py-3 text-sm focus:border-[#1A73E8] outline-none text-[#202124] dark:text-[#E8EAED]"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={prevStep} className="flex-1 py-3 border border-gray-200 dark:border-[#3C4043] text-[#5F6368] dark:text-[#9AA0A6] rounded-xl font-bold text-sm">Kembali</button>
                <button 
                  onClick={nextStep} 
                  disabled={!form.instansi_magang || !form.unit_magang}
                  className="flex-[2] py-3 bg-[#1A73E8] text-white rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  Lanjut
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PERIODE */}
          {step === 4 && (
            <div className="animate-[fade-in_0.3s_ease-out]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#FCE8E6] dark:bg-[#EA4335]/10 rounded-xl flex items-center justify-center text-[#EA4335]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#202124] dark:text-[#E8EAED]">Periode Magang</h3>
                  <p className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] uppercase font-bold tracking-wider">Langkah Terakhir</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-2 uppercase tracking-wide">Tanggal Mulai</label>
                  <input 
                    type="date" 
                    value={form.tanggal_mulai}
                    onChange={e => setForm({...form, tanggal_mulai: e.target.value})}
                    className="w-full bg-[#F8F9FA] dark:bg-[#303134] border border-gray-200 dark:border-[#3C4043] rounded-xl px-4 py-3 text-sm focus:border-[#1A73E8] outline-none text-[#202124] dark:text-[#E8EAED]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-2 uppercase tracking-wide">Tanggal Selesai</label>
                  <input 
                    type="date" 
                    value={form.tanggal_selesai}
                    onChange={e => setForm({...form, tanggal_selesai: e.target.value})}
                    className="w-full bg-[#F8F9FA] dark:bg-[#303134] border border-gray-200 dark:border-[#3C4043] rounded-xl px-4 py-3 text-sm focus:border-[#1A73E8] outline-none text-[#202124] dark:text-[#E8EAED]"
                  />
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-500/5 rounded-lg flex gap-3 border border-blue-100 dark:border-blue-900/30">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-700 dark:text-blue-400 leading-normal font-medium">
                    Pastikan tanggal sesuai dengan surat penugasan Anda. Data ini akan digunakan untuk menghitung target absensi.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={prevStep} className="flex-1 py-3 border border-gray-200 dark:border-[#3C4043] text-[#5F6368] dark:text-[#9AA0A6] rounded-xl font-bold text-sm">Kembali</button>
                <button 
                  onClick={handleSubmit} 
                  disabled={loading || !form.tanggal_mulai || !form.tanggal_selesai}
                  className="flex-[2] py-3 bg-[#34A853] text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Menyimpan...' : <><CheckCircle2 className="w-4 h-4" /> Selesaikan</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Branding Footer */}
        <div className="bg-[#F8F9FA] dark:bg-[#303134] px-8 py-4 border-t border-gray-100 dark:border-[#3C4043] flex items-center justify-between">
          <div className="flex items-center gap-1.5 grayscale opacity-50">
            <img src="/logoorbitsvg.svg" alt="Orbit" className="h-5 w-auto" />
            <span className="text-[10px] font-black tracking-tighter text-[#202124] dark:text-white">ORBIT</span>
          </div>
          <p className="text-[10px] text-[#9AA0A6] font-medium italic">Empowering your journey.</p>
        </div>
      </div>
    </div>
  )
}
