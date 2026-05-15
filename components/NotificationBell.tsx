'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Bell, Check, Trash2, Info, AlertCircle, MessageCircle } from 'lucide-react'
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
    fetchNotifications()
    
    // Realtime subscription
    const channel = supabase
      .channel('notifications_changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications' 
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev])
        setUnreadCount(prev => prev + 1)
        toast.info('Notifikasi baru diterima')
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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
        className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm text-[#5F6368] hover:bg-gray-50 border border-gray-100 relative transition-all active:scale-95"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-4 h-4 bg-[#EA4335] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-[scale-in_0.2s_ease-out]">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-sm font-bold text-[#202124]">Notifikasi</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-[#1A73E8] hover:underline uppercase tracking-wider"
                >
                  Baca Semua
                </button>
              )}
            </div>

            <div className="max-h-[350px] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5F6368]">Memuat...</div>
              ) : notifications.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 text-gray-300">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-medium text-[#5F6368]">Belum ada notifikasi</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`px-5 py-4 hover:bg-gray-50 transition-colors flex gap-3 relative ${!n.is_read ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        n.type === 'warning' ? 'bg-[#FEF7E0] text-[#E37400]' :
                        n.type === 'error' ? 'bg-[#FCE8E6] text-[#C5221F]' :
                        n.type === 'success' ? 'bg-[#E6F4EA] text-[#137333]' :
                        'bg-[#E8F0FE] text-[#1A73E8]'
                      }`}>
                        {n.type === 'warning' ? <AlertCircle className="w-4 h-4" /> :
                         n.type === 'success' ? <Check className="w-4 h-4" /> :
                         <Info className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-relaxed ${!n.is_read ? 'font-bold text-[#202124]' : 'text-[#5F6368]'}`}>
                          {n.message}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(n.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {new Date(n.created_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      {!n.is_read && (
                        <button 
                          onClick={() => markAsRead(n.id)}
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white text-[#1A73E8] transition-colors"
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
