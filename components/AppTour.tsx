'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, ChevronRight, Check } from 'lucide-react'

interface AppTourProps {
  userId: string
  onComplete: () => void
  isMobileSidebarOpen: boolean
  setIsMobileSidebarOpen: (open: boolean) => void
}

export default function AppTour({ userId, onComplete, isMobileSidebarOpen, setIsMobileSidebarOpen }: AppTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [isDesktop, setIsDesktop] = useState(true)
  const [windowHeight, setWindowHeight] = useState(800)
  const [loading, setLoading] = useState(false)

  const steps = [
    {
      targetId: 'tour-absensi',
      title: 'Menu Absensi',
      description: 'Mencatat kehadiran harian Anda (check-in & check-out) secara praktis dengan deteksi lokasi.',
    },
    {
      targetId: 'tour-jurnal',
      title: 'Menu Jurnal',
      description: 'Mengisi aktivitas harian magang Anda untuk dipantau dan disetujui oleh dosen pembimbing.',
    },
    {
      targetId: 'tour-bimbingan',
      title: 'Menu Bimbingan',
      description: 'Mencatat riwayat bimbingan dengan dosen pembimbing, mengunggah foto dokumentasi, dan melacak progres kelayakan.',
    }
  ]

  // Detect screen size and dimensions safely on client
  useEffect(() => {
    const checkScreen = () => {
      setIsDesktop(window.innerWidth >= 1024)
      setWindowHeight(window.innerHeight)
    }
    checkScreen()
    window.addEventListener('resize', checkScreen)
    return () => window.removeEventListener('resize', checkScreen)
  }, [])

  // Manage sidebar open state on mobile during the tour
  useEffect(() => {
    if (!isDesktop && !isMobileSidebarOpen) {
      setIsMobileSidebarOpen(true)
    }
  }, [isDesktop, isMobileSidebarOpen, setIsMobileSidebarOpen])

  // Calculate coordinates of the highlighted element
  useEffect(() => {
    const updateCoords = () => {
      const activeStep = steps[currentStep]
      if (!activeStep) return

      const element = document.getElementById(activeStep.targetId)
      if (element) {
        const rect = element.getBoundingClientRect()
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        })
      } else {
        setCoords(null)
      }
    }

    // Wait a brief moment to allow transitions (like sidebar opening) to settle
    const timer = setTimeout(updateCoords, 300)

    window.addEventListener('resize', updateCoords)
    window.addEventListener('scroll', updateCoords)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateCoords)
      window.removeEventListener('scroll', updateCoords)
    }
  }, [currentStep, isDesktop, isMobileSidebarOpen])

  const handleFinishOrSkip = async () => {
    if (loading) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ has_seen_tour: true })
        .eq('id', userId)
      
      if (error) {
        console.error('Error updating has_seen_tour status:', error)
      }
    } catch (err) {
      console.error('Runtime error updating tour status:', err)
    } finally {
      setLoading(false)
      onComplete()
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleFinishOrSkip()
    }
  }

  const activeStep = steps[currentStep]

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Semi-transparent dark overlay */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={handleFinishOrSkip}
      />

      {/* Spotlight highlight overlay box */}
      {coords && (
        <div 
          className="absolute border-2 border-blue-500 rounded-[16px] transition-all duration-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.15)] ring-4 ring-blue-500/40 ring-offset-2 animate-pulse pointer-events-none"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            height: `${coords.height}px`,
          }}
        />
      )}

      {/* High contrast tour dialog */}
      <div 
        className={`fixed bg-slate-900 border border-slate-700/50 shadow-2xl p-6 rounded-2xl text-white transition-all duration-300 z-[110]
          ${isDesktop && coords 
            ? 'w-[320px]' 
            : 'w-[calc(100%-32px)] max-w-md bottom-6 left-1/2 -translate-x-1/2'
          }`}
        style={isDesktop && coords ? {
          left: `${coords.left + coords.width + 20}px`,
          top: `${Math.max(20, Math.min(windowHeight - 240 - 20, coords.top - 10))}px`,
        } : undefined}
      >
        {/* Close/Skip button at the corner */}
        <button 
          onClick={handleFinishOrSkip}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Lewati Panduan"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Dialog Content */}
        <div className="mb-4">
          <div className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest mb-1">
            Panduan ORBIT • Langkah {currentStep + 1} dari {steps.length}
          </div>
          <h4 className="text-lg font-bold text-white mb-2">
            {activeStep.title}
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            {activeStep.description}
          </p>
        </div>

        {/* Dialog Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          {/* Progress dots & Skip link */}
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentStep ? 'bg-blue-500 w-4' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <button 
              onClick={handleFinishOrSkip}
              className="text-xs text-slate-400 hover:text-white font-semibold transition-colors cursor-pointer"
            >
              Lewati
            </button>
          </div>

          {/* Next/Finish Button */}
          <button
            onClick={handleNext}
            disabled={loading}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50
              ${currentStep === steps.length - 1 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
          >
            {loading ? (
              'Menyimpan...'
            ) : currentStep === steps.length - 1 ? (
              <>Selesai <Check className="w-4 h-4" /></>
            ) : (
              <>Lanjut <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
