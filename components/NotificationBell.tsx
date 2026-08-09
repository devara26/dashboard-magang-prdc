'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Bell, 
  CheckCircle2, 
  XCircle, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Inbox 
} from 'lucide-react'
import { toast } from 'sonner'

export default function NotificationBell() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const bellRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Fetch notifications and subscribe to real-time updates
  useEffect(() => {
    let isMounted = true
    let channel: any

    async function initNotifications() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !isMounted) return

      // 1. Fetch top 10 latest notifications
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!isMounted) return

      if (error) {
        console.error('Error fetching notifications:', error)
      } else {
        setNotifications(data || [])
      }

      // 2. Fetch exact count of unread notifications
      const { count, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (!isMounted) return

      if (!countError) {
        setUnreadCount(count || 0)
      }

      // Remove any existing duplicate channel reference before subscribing
      try {
        const existingChannel = supabase.getChannels().find(c => c.topic === 'realtime_notifications')
        if (existingChannel) {
          await supabase.removeChannel(existingChannel)
        }
      } catch (e) {
        console.error('Error removing existing channel:', e)
      }

      if (!isMounted) return

      // 3. Realtime Subscription (ensure .on() is chained BEFORE .subscribe())
      channel = supabase.channel('realtime_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload: any) => {
            if (!isMounted) return
            const newNotif = payload.new
            
            // Add new notification to top of local state
            setNotifications(prev => [newNotif, ...prev.slice(0, 9)])
            setUnreadCount(prev => prev + 1)
            
            // Display toast using sonner
            toast(newNotif.message, {
              description: 'Notifikasi baru dari dosen pembimbing',
              icon: getNotificationIcon(newNotif.type, 'h-5 w-5'),
              duration: 5000,
            })
          }
        )
        .subscribe()
    }

    initNotifications()

    return () => {
      isMounted = false
      if (channel) {
        supabase.removeChannel(channel)
      } else {
        // Fallback: search and remove by name synchronously during cleanup
        const existingChannel = supabase.getChannels().find(c => c.topic === 'realtime_notifications')
        if (existingChannel) {
          supabase.removeChannel(existingChannel)
        }
      }
    }
  }, [])

  const getNotificationIcon = (type: string, className = 'h-4 w-4') => {
    switch (type) {
      case 'berkas_verified':
        return <CheckCircle2 className={`${className} text-emerald-500`} />
      case 'berkas_rejected':
        return <XCircle className={`${className} text-red-500`} />
      case 'jurnal_approved':
        return <CheckCircle className={`${className} text-blue-500`} />
      case 'jurnal_rejected':
        return <AlertTriangle className={`${className} text-orange-500`} />
      default:
        return <Bell className={`${className} text-gray-500`} />
    }
  }

  const getRelativeTime = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000))
      const diffMins = Math.floor(diffSecs / 60)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffSecs < 60) {
        return 'Baru saja'
      }
      if (diffMins < 60) {
        return `${diffMins} menit lalu`
      }
      if (diffHours < 24) {
        return `${diffHours} jam lalu`
      }
      return `${diffDays} hari lalu`
    } catch (e) {
      return ''
    }
  }

  const handleItemClick = async (notif: any) => {
    // Mark single notification as read
    if (!notif.is_read) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notif.id)

      if (!error) {
        setNotifications(prev =>
          prev.map(n => (n.id === notif.id ? { ...n, is_read: true } : n))
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    }

    setIsOpen(false)

    // Route to appropriate page
    if (notif.type === 'berkas_verified' || notif.type === 'berkas_rejected') {
      router.push('/dashboard/berkas')
    } else if (notif.type === 'jurnal_approved' || notif.type === 'jurnal_rejected') {
      router.push('/dashboard/kegiatan')
    }
  }

  const handleMarkAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      toast.success('Semua notifikasi ditandai telah dibaca')
    } else {
      toast.error('Gagal memperbarui notifikasi')
    }
  }

  return (
    <div className="relative" ref={bellRef}>
      {/* Bell Button Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 transition-all border border-gray-200/60 shadow-sm active:scale-95 cursor-pointer"
        aria-label="Notifikasi"
      >
        <Bell className="h-5 w-5 text-gray-600 hover:text-blue-600 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-extrabold w-4.5 h-4.5 flex items-center justify-center rounded-full border-2 border-white animate-pulse shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown List */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white border border-gray-200/80 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-250">
          {/* Header section */}
          <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <h4 className="text-sm font-bold text-gray-900">Notifikasi</h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* List items */}
          <div className="max-h-[350px] overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <Inbox size={20} />
                </div>
                <p className="text-xs font-bold text-gray-800">Tidak Ada Notifikasi</p>
                <p className="text-[10px] font-semibold text-gray-400 max-w-[200px]">Kamu akan melihat pembaruan status berkas atau jurnal di sini.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`flex gap-3 px-5 py-4 cursor-pointer transition-colors relative ${
                    notif.is_read ? 'bg-white hover:bg-gray-50/70' : 'bg-blue-50/15 hover:bg-blue-50/30'
                  }`}
                >
                  {/* Left Column: Icon depending on notification category */}
                  <div className="mt-0.5 shrink-0">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 shadow-sm">
                      {getNotificationIcon(notif.type)}
                    </div>
                  </div>

                  {/* Middle Column: Message text & Relative Time */}
                  <div className="flex-1 space-y-1">
                    <p className={`text-xs leading-relaxed ${notif.is_read ? 'text-gray-600 font-semibold' : 'text-gray-900 font-bold'}`}>
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-semibold">
                      <Clock size={10} />
                      <span>{getRelativeTime(notif.created_at)}</span>
                    </div>
                  </div>

                  {/* Right Column: Unread status indicator (blue dot) */}
                  {!notif.is_read && (
                    <div className="shrink-0 flex items-center justify-center self-center pl-1">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
