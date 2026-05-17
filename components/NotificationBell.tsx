'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Bell, Check, Trash2, Info, AlertCircle, MessageCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

type Notification = {
  id: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  is_read: boolean
  created_at: string
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let channel: any
    let isMounted = true

    async function setupRealtime() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !isMounted) return

      fetchNotifications()

      const channelName = `notifications_user_${user.id}_${Math.random().toString(36).substring(7)}`
      
      // Realtime subscription dengan urutan yang benar
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          }, 
          (payload) => {
            if (isMounted) {
              console.log('Perubahan data real-time:', payload)
              fetchNotifications()
            }
          }
        )
        .subscribe()
    }

    setupRealtime()

    return () => {
      isMounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  async function fetchNotifications() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.is_read).length || 0)
    } catch (error) {
      console.error('Fetch Notifications Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(id: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)

      if (error) throw error
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      toast.error('Gagal memperbarui status notifikasi')
    }
  }

  async function markAllAsRead() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      toast.success('Semua notifikasi ditandai telah dibaca')
    } catch (error) {
      toast.error('Gagal memperbarui notifikasi')
    }
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 flex items-center justify-center bg-white dark:bg-[#303134] rounded-full shadow-sm text-[#5F6368] dark:text-[#9AA0A6] hover:bg-gray-50 dark:hover:bg-[#3C4043] border border-gray-100 dark:border-[#3C4043] relative transition-all active:scale-95"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-4 h-4 bg-[#EA4335] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-[#3C4043] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#202124] rounded-2xl shadow-xl border border-gray-100 dark:border-[#3C4043] z-50 overflow-hidden animate-[scale-in_0.2s_ease-out]">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-[#3C4043] flex items-center justify-between bg-gray-50/50 dark:bg-[#303134]/50">
              <h3 className="text-sm font-bold text-[#202124] dark:text-[#E8EAED]">Notifikasi</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-[#1A73E8] hover:underline uppercase tracking-wider"
                >
                  Baca Semua
                </button>
              )}
            </div>

            <div className="max-h-[350px] overflow-y-auto no-scrollbar">
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5F6368] dark:text-[#9AA0A6]">Memuat...</div>
              ) : notifications.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-gray-50 dark:bg-[#303134] rounded-full flex items-center justify-center mb-3 text-gray-300 dark:text-[#5F6368]">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-medium text-[#5F6368] dark:text-[#9AA0A6]">Belum ada notifikasi</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-[#3C4043]">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`px-5 py-4 hover:bg-gray-50 dark:hover:bg-[#303134] transition-colors flex gap-3 relative ${!n.is_read ? 'bg-blue-50/30 dark:bg-blue-500/5' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        n.type === 'warning' ? 'bg-[#FEF7E0] dark:bg-[#FBBC04]/10 text-[#E37400] dark:text-[#FBBC04]' :
                        n.type === 'error' ? 'bg-[#FCE8E6] dark:bg-[#EA4335]/10 text-[#C5221F] dark:text-[#EA4335]' :
                        n.type === 'success' ? 'bg-[#E6F4EA] dark:bg-[#34A853]/10 text-[#137333] dark:text-[#34A853]' :
                        'bg-[#E8F0FE] dark:bg-[#1A73E8]/10 text-[#1A73E8] dark:text-[#4285F4]'
                      }`}>
                        {n.type === 'warning' ? <AlertCircle className="w-4 h-4" /> :
                         n.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                         <Info className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-relaxed ${!n.is_read ? 'font-bold text-[#202124] dark:text-[#E8EAED]' : 'text-[#5F6368] dark:text-[#9AA0A6]'}`}>
                          {n.message}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-[#5F6368] mt-1">
                          {new Date(n.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {new Date(n.created_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      {!n.is_read && (
                        <button 
                          onClick={() => markAsRead(n.id)}
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-[#3C4043] text-[#1A73E8] transition-colors"
                          title="Tandai dibaca"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
