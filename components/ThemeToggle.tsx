'use client'

import { useTheme } from './ThemeProvider'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 flex items-center justify-center bg-white dark:bg-[#303134] rounded-full shadow-sm text-[#5F6368] dark:text-[#9AA0A6] hover:bg-gray-50 dark:hover:bg-[#3C4043] border border-gray-100 dark:border-[#3C4043] transition-all active:scale-95"
      title={theme === 'light' ? 'Ganti ke Mode Gelap' : 'Ganti ke Mode Terang'}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5 text-[#FBBC04]" />
      )}
    </button>
  )
}
