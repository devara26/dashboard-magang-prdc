'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Bell } from 'lucide-react'

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchUnreadCount()

    // PERBAIKAN URUTAN: Daftarkan event .on() terlebih dahulu SECARA PENUH
    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('Notifikasi baru masuk:', payload)
          setUnreadCount((prev) => prev + 1)
        }
      )
      .subscribe() // <-- .subscribe() WAJIB ditaruh di paling akhir rangkaian fungsi

    // CLEANUP HOOK: Menghapus channel saat komponen mati untuk mencegah WebSocket bocor/fail
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchUnreadCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Memastikan query filter count berjalan aman tanpa salah ketik kolom
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error
      setUnreadCount(count || 0)
    } catch (err) {
      console.error('Gagal mengambil data notifikasi:', err)
    }
  }

  return (
    <button className="relative w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-[var(--text-main)]">
      <Bell size={22} />
      {unreadCount > 0 && (
        <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
      )}
    </button>
  )
}