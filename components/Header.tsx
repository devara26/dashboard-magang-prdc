'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Bell } from 'lucide-react'

export default function Header() {
  const [bukaNotif, setBukaNotif] = useState(false)
  const [daftarNotif, setDaftarNotif] = useState<any[]>([])
  const [belumDibaca, setBelumDibaca] = useState(0)

  useEffect(() => {
    const ambilNotifikasi = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('notifications')
        .select('id, message, type, is_read')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (data) {
        setDaftarNotif(data)
        const jumlahBelumDibaca = data.filter(n => !n.is_read).length
        setBelumDibaca(jumlahBelumDibaca)
      }
    }
    ambilNotifikasi()
  }, [])

  const tandaiSemuaDibaca = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    const notifBaru = daftarNotif.map(n => ({ ...n, is_read: true }))
    setDaftarNotif(notifBaru)
    setBelumDibaca(0)
  }

  return (
    <div className="relative">
      <button onClick={() => setBukaNotif(!bukaNotif)} className="relative p-2">
        <Bell className="h-6 w-6" />
        {belumDibaca > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
        )}
      </button>

      {bukaNotif && (
        <div className="absolute right-0 mt-2 w-72 bg-white border rounded shadow-lg p-4 z-50">
          <div className="flex justify-between items-center border-b pb-2">
            <p className="text-sm font-bold">Notifikasi</p>
            {belumDibaca > 0 && (
              <button onClick={tandaiSemuaDibaca} className="text-xs text-blue-600 hover:underline">
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="text-sm text-gray-600 pt-2 flex flex-col gap-3">
            {daftarNotif.map((notif) => (
              <div key={notif.id} className="border-b pb-2 last:border-0 flex gap-2">
                {!notif.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1 shrink-0"></span>}
                <div>
                  <p className="font-semibold text-black capitalize">{notif.type}</p>
                  <p className="text-xs mt-1 text-gray-600">{notif.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

