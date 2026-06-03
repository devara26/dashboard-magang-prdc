'use server'

import { createClient } from '../../../lib/supabase-server'

export async function verifyDosenAction(code: string) {
  const validCode = process.env.DOSEN_ACCESS_CODE || '123'
  if (code !== validCode) {
    return { success: false, error: 'Kode akses salah!' }
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Sesi tidak ditemukan atau kedaluwarsa. Silakan login kembali.' }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'dosen' })
      .eq('id', user.id)

    if (updateError) {
      return { success: false, error: 'Gagal memperbarui peran di database: ' + updateError.message }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: 'Terjadi kesalahan server: ' + error.message }
  }
}
