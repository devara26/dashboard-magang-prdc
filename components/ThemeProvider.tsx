'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme] = useState<Theme>('light')

  useEffect(() => {
    // Force light mode
    document.documentElement.classList.remove('dark')
    document.documentElement.style.colorScheme = 'light'
    localStorage.removeItem('theme')
  }, [])

  const toggleTheme = () => {
    // No-op
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
