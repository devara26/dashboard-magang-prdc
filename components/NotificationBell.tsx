'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Bell } from 'lucide-react'

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchUnreadCount()

    // Membuat ID channel yang unik menggunakan timestamp agar tidak tabrakan di mobile & desktop
    const uniqueChannelName = `notif_channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('Notifikasi baru masuk:', payload)
          setUnreadCount((prev) => prev + 1)
        }
      )

    // Memastikan status channel sudah dikonfigurasi penuh sebelum memanggil fungsi subscribe
    const sub = channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Koneksi realtime notifikasi berhasil dikunci.')
      }
    })

    // CLEANUP HOOK: Wajib menghapus channel secara bersih saat layar berpindah/ditutup
    return () => {
      supabase.removeChannel(sub)
    }
  }, [])

  async function fetchUnreadCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error
      setUnreadCount(count || 0)
    } catch (err) {
      console.error('Gagal memuat statistik notifikasi:', err)
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