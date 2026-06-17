'use client'

import React, { useState, useRef } from 'react'
import { Upload, File, AlertCircle, X, CheckCircle2 } from 'lucide-react'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  onClear?: () => void
  accept?: string
  maxSizeMB?: number
  currentFileName?: string
  currentFileUrl?: string
  status?: 'idle' | 'uploading' | 'success' | 'error'
  errorMessage?: string
}

export default function FileUpload({
  onFileSelect,
  onClear,
  accept = '.pdf,.jpg,.jpeg,.png,.docx,.xlsx,.xls',
  maxSizeMB = 5,
  currentFileName,
  currentFileUrl,
  status = 'idle',
  errorMessage
}: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [localFile, setLocalFile] = useState<File | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true)
    } else if (e.type === 'dragleave') {
      setIsDragActive(false)
    }
  }

  const validateFile = (file: File): boolean => {
    setLocalError(null)

    // Check size
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      setLocalError(`Ukuran file melebihi batas maksimum (${maxSizeMB} MB)`)
      return false
    }

    // Check extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = accept.split(',').map(ext => ext.trim().toLowerCase())
    if (!allowedExtensions.includes(extension)) {
      setLocalError(`Format file tidak didukung. Format yang diizinkan: ${accept}`)
      return false
    }

    return true
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (validateFile(file)) {
        setLocalFile(file)
        onFileSelect(file)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (validateFile(file)) {
        setLocalFile(file)
        onFileSelect(file)
      }
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const clearSelection = () => {
    setLocalFile(null)
    setLocalError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (onClear) {
      onClear()
    }
  }

  const displayError = localError || errorMessage

  return (
    <div className="w-full">
      {/* File Input Element */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleChange}
      />

      {/* Upload Box container */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={handleButtonClick}
        className={`relative w-full border-2 border-dashed rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? 'border-blue-600 bg-blue-50/50 scale-[1.01]'
            : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50/50'
        } ${status === 'uploading' ? 'pointer-events-none opacity-60' : ''}`}
      >
        {status === 'uploading' ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-gray-650 text-gray-700 animate-pulse">Mengunggah berkas...</p>
          </div>
        ) : localFile || currentFileName ? (
          <div className="flex flex-col items-center space-y-3 w-full" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <File size={24} />
            </div>
            <div className="max-w-xs md:max-w-sm truncate text-center">
              <p className="text-sm font-bold text-gray-900 truncate">
                {localFile ? localFile.name : currentFileName}
              </p>
              {localFile && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {(localFile.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>

            {/* Actions for current selection */}
            <div className="flex items-center gap-3 mt-4">
              {currentFileUrl && (
                <a
                  href={currentFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  Lihat Berkas
                </a>
              )}
              <button
                type="button"
                onClick={clearSelection}
                className="px-4 py-2 bg-red-50 text-red-650 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <X size={14} /> Hapus
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mx-auto group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <Upload size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-800">
                <span className="text-blue-600 font-extrabold hover:underline">Pilih file</span> atau seret ke sini
              </p>
              <p className="text-xs text-gray-500">
                Maksimal {maxSizeMB} MB ({accept.replace(/\./g, '').toUpperCase()})
              </p>
            </div>
          </div>
        )}

        {/* Status indicator absolute overlays */}
        {status === 'success' && (
          <div className="absolute top-3 right-3 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full border border-emerald-100 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
            <CheckCircle2 size={12} /> Terunggah
          </div>
        )}
      </div>

      {/* Error Output */}
      {displayError && (
        <div className="mt-3 flex items-start gap-2 text-red-605 text-red-650 text-red-650 text-red-600 text-xs font-semibold bg-red-50/50 p-3 rounded-xl border border-red-100/50 animate-in slide-in-from-top-2 duration-300">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  )
}
