'use client'

import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

export default function BerkasIdRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  
  useEffect(() => {
    router.replace(`/dosen/monitor/${resolvedParams.id}`)
  }, [router, resolvedParams.id])

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-gray-50/50">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-500 font-bold text-sm tracking-tight">Mengarahkan ke detail bimbingan...</p>
      </div>
    </div>
  )
}
