'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { logAction } from '@/lib/audit'

export default function JurnalPage() {
  const [kegiatan, setKegiatan] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newKegiatan, setNewKegiatan] = useState({
    kegiatan: '',
    deskripsi: '',
    tanggal: new Date().toISOString().split('T')[0],
    status: 'Proses'
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)

      if (profileData?.nim) {
        let { data, error } = await supabase.from('Kegiatan').select('*').eq('nim', profileData.nim).order('tanggal', { ascending: false })
        if (error) {
          const { data: dataLow } = await supabase.from('kegiatan').select('*').eq('nim', profileData.nim).order('tanggal', { ascending: false })
          data = dataLow
        }
        setKegiatan(data || [])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = { ...newKegiatan, nim: profile.nim, nama_lengkap: profile.nama_lengkap }
      let { error } = await supabase.from('Kegiatan').insert([payload])
      if (error) {
        const { error: errorLow } = await supabase.from('kegiatan').insert([payload])
        if (errorLow) throw errorLow
      }
      
      await logAction('Tambah Jurnal', `Menambahkan kegiatan: ${newKegiatan.kegiatan}`)
      toast.success('Jurnal berhasil ditambahkan')
      setShowModal(false)
      setNewKegiatan({ kegiatan: '', deskripsi: '', tanggal: new Date().toISOString().split('T')[0], status: 'Proses' })
      fetchData()
    } catch (error: any) {
      toast.error('Gagal: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <div className="space-y-10 pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-[28px] font-black tracking-tight text-[var(--text-main)]">Daily Journal</h1>
           <p className="text-[14px] font-medium text-[var(--text-muted)]">Track and document your internship activities</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-white rounded-xl text-[13px] font-black hover:opacity-90 shadow-lg shadow-blue-100 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">post_add</span>
          Write Entry
        </button>
      </div>

      {/* Main List - Bento Style */}
      <div className="space-y-6">
         {kegiatan.map((item, idx) => (
            <div key={item.id} className="bento-card group hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer">
               <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex gap-6">
                     <div className="hidden md:flex flex-col items-center w-14 shrink-0">
                        <span className="text-[20px] font-black text-[var(--text-main)] leading-none">{new Date(item.tanggal).getDate()}</span>
                        <span className="text-[10px] font-bold text-[var(--text-light)] uppercase tracking-widest mt-1">{new Date(item.tanggal).toLocaleDateString('en-US', { month: 'short' })}</span>
                        <div className="w-px h-12 bg-[var(--border)] mt-3"></div>
                     </div>
                     <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                           <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${item.status === 'Selesai' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                              {item.status}
                           </span>
                           <span className="text-[11px] font-bold text-[var(--text-light)] flex items-center gap-1.5 md:hidden">
                              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                              {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                           </span>
                        </div>
                        <h3 className="text-[18px] font-black text-[var(--text-main)] group-hover:text-[var(--accent)] transition-colors">{item.kegiatan}</h3>
                        <p className="text-[14px] font-medium text-[var(--text-muted)] leading-relaxed max-w-2xl">{item.deskripsi}</p>
                     </div>
                  </div>
                  <div className="flex md:flex-col items-center justify-between md:justify-start gap-4">
                     <div className="flex -space-x-2">
                        {[1,2].map(i => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-[var(--bg-app)] flex items-center justify-center text-[10px] font-black">
                             {i === 1 ? 'JD' : 'M'}
                          </div>
                        ))}
                     </div>
                     <button className="w-10 h-10 rounded-full bg-[var(--bg-app)] flex items-center justify-center text-[var(--text-light)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all">
                        <span className="material-symbols-outlined">chat_bubble</span>
                     </button>
                  </div>
               </div>
            </div>
         ))}

         {kegiatan.length === 0 && (
            <div className="bento-card py-20 text-center space-y-6">
               <div className="w-20 h-20 bg-[var(--bg-app)] rounded-3xl flex items-center justify-center mx-auto text-[var(--text-light)]">
                  <span className="material-symbols-outlined text-[40px]">edit_note</span>
               </div>
               <div>
                  <h4 className="text-[18px] font-black">No entries yet</h4>
                  <p className="text-[14px] font-medium text-[var(--text-muted)] mt-1">Start documenting your internship progress today.</p>
               </div>
               <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-[var(--text-main)] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90">Create First Entry</button>
            </div>
         )}
      </div>

      {/* Write Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
           <div className="bg-white w-full max-w-xl rounded-[var(--radius-xl)] shadow-2xl relative z-10 overflow-hidden animate-slide-up">
              <form onSubmit={handleSubmit} className="p-10 space-y-8">
                 <div className="flex justify-between items-start">
                    <div>
                       <h3 className="text-[24px] font-black tracking-tight">Write Entry</h3>
                       <p className="text-[14px] font-medium text-[var(--text-muted)]">Describe what you did today</p>
                    </div>
                    <button type="button" onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full hover:bg-[var(--bg-app)] flex items-center justify-center transition-colors">
                       <span className="material-symbols-outlined">close</span>
                    </button>
                 </div>

                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-[var(--text-light)] uppercase tracking-widest ml-1">Activity Title</label>
                       <input required value={newKegiatan.kegiatan} onChange={e => setNewKegiatan({...newKegiatan, kegiatan: e.target.value})} placeholder="e.g. Develop login authentication module" className="w-full bg-[var(--bg-app)] border border-[var(--border)] rounded-[var(--radius-md)] px-5 py-4 text-sm font-semibold outline-none focus:border-[var(--accent)] focus:bg-white transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[11px] font-black text-[var(--text-light)] uppercase tracking-widest ml-1">Date</label>
                          <input type="date" required value={newKegiatan.tanggal} onChange={e => setNewKegiatan({...newKegiatan, tanggal: e.target.value})} className="w-full bg-[var(--bg-app)] border border-[var(--border)] rounded-[var(--radius-md)] px-5 py-4 text-sm font-semibold outline-none focus:border-[var(--accent)] focus:bg-white transition-all" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[11px] font-black text-[var(--text-light)] uppercase tracking-widest ml-1">Initial Status</label>
                          <select value={newKegiatan.status} onChange={e => setNewKegiatan({...newKegiatan, status: e.target.value})} className="w-full bg-[var(--bg-app)] border border-[var(--border)] rounded-[var(--radius-md)] px-5 py-4 text-sm font-semibold outline-none focus:border-[var(--accent)] focus:bg-white transition-all appearance-none">
                             <option>Proses</option>
                             <option>Selesai</option>
                          </select>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-[var(--text-light)] uppercase tracking-widest ml-1">Detailed Description</label>
                       <textarea required rows={4} value={newKegiatan.deskripsi} onChange={e => setNewKegiatan({...newKegiatan, deskripsi: e.target.value})} placeholder="What were the challenges? What tools did you use?..." className="w-full bg-[var(--bg-app)] border border-[var(--border)] rounded-[var(--radius-md)] px-5 py-4 text-sm font-semibold outline-none focus:border-[var(--accent)] focus:bg-white transition-all resize-none" />
                    </div>
                 </div>

                 <button type="submit" disabled={submitting} className="w-full py-5 bg-[var(--accent)] text-white rounded-[var(--radius-md)] text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:opacity-90 disabled:opacity-50 transition-all">
                    {submitting ? 'Publishing...' : 'Publish Entry'}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  )
}
