'use client'

import React from 'react'

interface BerkasProgressProps {
  value: number
  total?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function BerkasProgress({
  value = 0,
  total = 12,
  className = '',
  size = 'md'
}: BerkasProgressProps) {
  const safeValue = Math.max(0, Math.min(value, total))
  const percentage = total > 0 ? Math.round((safeValue / total) * 100) : 0

  // Color logic based on completeness
  let progressColor = 'bg-red-500' // Belum Lengkap (< 50%)
  if (percentage === 100) {
    progressColor = 'bg-emerald-500' // Lengkap (100%)
  } else if (percentage >= 50) {
    progressColor = 'bg-amber-500' // Sedang diupload / Perlu Review
  }

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  }

  return (
    <div className={`w-full space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${percentage === 100 ? 'bg-emerald-500 animate-pulse' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
          {safeValue} dari {total} Berkas
        </span>
        <span className="text-gray-900 font-bold">{percentage}%</span>
      </div>
      
      <div className="w-full bg-gray-150 bg-gray-200/60 rounded-full overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${progressColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
