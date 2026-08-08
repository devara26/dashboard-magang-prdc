import { SupabaseClient } from '@supabase/supabase-js'

export interface PeriodeMagang {
  id: number
  mahasiswa_id: string
  nomor_periode: number
  nama_instansi: string
  jenis_instansi: string
  unit_divisi: string
  dosen_id: string | null
  tanggal_mulai: string | null
  tanggal_selesai: string | null
  status: 'aktif' | 'selesai'
}

export async function getActivePeriode(supabase: SupabaseClient, userId: string): Promise<PeriodeMagang | null> {
  console.log('[getActivePeriode] Checking active period for userId:', userId)
  try {
    // 1. Ambil active_periode_id dari profiles
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('active_periode_id, instansi_magang, unit_magang, dosen_id, tanggal_mulai, tanggal_selesai')
      .eq('id', userId)
      .maybeSingle()

    if (profileErr) {
      console.error('[getActivePeriode] Error fetching profile:', profileErr)
    }

    console.log('[getActivePeriode] Profile query result:', { exists: !!profile, active_periode_id: profile?.active_periode_id })

    // 2. Jika profile ada dan active_periode_id ada, ambil periode tersebut
    if (profile?.active_periode_id) {
      console.log('[getActivePeriode] Found active_periode_id:', profile.active_periode_id)
      const { data: periode, error: periodeErr } = await supabase
        .from('periode_magang')
        .select('*')
        .eq('id', profile.active_periode_id)
        .maybeSingle()

      if (periodeErr) {
        console.error('[getActivePeriode] Error fetching active period details:', periodeErr)
      }

      if (periode) {
        console.log('[getActivePeriode] Successfully retrieved active period:', periode)
        return periode
      }
    }

    // 3. Fallback: jika active_periode_id null, cari nomor_periode = 1 dari tabel periode_magang WHERE mahasiswa_id = userId
    console.log('[getActivePeriode] active_periode_id is null. Checking fallback for nomor_periode = 1...')
    const { data: fallbackPeriode, error: fallbackErr } = await supabase
      .from('periode_magang')
      .select('*')
      .eq('mahasiswa_id', userId)
      .eq('nomor_periode', 1)
      .maybeSingle()

    if (fallbackErr) {
      console.error('[getActivePeriode] Error querying fallback Magang 1:', fallbackErr)
    }

    if (fallbackPeriode) {
      console.log('[getActivePeriode] Found fallback Magang 1:', fallbackPeriode)
      // Update active_periode_id di profiles agar query berikutnya tersinkron
      if (profile) {
        console.log('[getActivePeriode] Updating profiles.active_periode_id to fallback:', fallbackPeriode.id)
        await supabase
          .from('profiles')
          .update({ active_periode_id: fallbackPeriode.id })
          .eq('id', userId)
      }
      return fallbackPeriode
    }

    // 4. Jika tidak ada record nomor_periode 1, cari record lain
    console.log('[getActivePeriode] Fallback nomor_periode = 1 not found. Checking any period for user...')
    const { data: anyPeriodes, error: anyErr } = await supabase
      .from('periode_magang')
      .select('*')
      .eq('mahasiswa_id', userId)
      .order('nomor_periode', { ascending: true })

    if (anyErr) {
      console.error('[getActivePeriode] Error querying any periods:', anyErr)
    }

    if (anyPeriodes && anyPeriodes.length > 0) {
      const active = anyPeriodes[0]
      console.log('[getActivePeriode] Found an existing period:', active)
      if (profile) {
        await supabase
          .from('profiles')
          .update({ active_periode_id: active.id })
          .eq('id', userId)
      }
      return active
    }

    // 5. Inisialisasi Magang 1 dari data profile (jika ada instansi_magang)
    if (profile?.instansi_magang) {
      console.log('[getActivePeriode] No period found in database. Initializing Magang 1 from profile details...')
      const { data: newPeriode, error: insertErr } = await supabase
        .from('periode_magang')
        .insert([{
          mahasiswa_id: userId,
          nomor_periode: 1,
          nama_instansi: profile.instansi_magang,
          jenis_instansi: 'swasta', // fallback default
          unit_divisi: profile.unit_magang || '',
          dosen_id: profile.dosen_id || null,
          tanggal_mulai: profile.tanggal_mulai || null,
          tanggal_selesai: profile.tanggal_selesai || null,
          status: 'aktif'
        }])
        .select()
        .single()

      if (insertErr) {
        console.error('[getActivePeriode] Error auto-creating Magang 1:', insertErr)
      } else if (newPeriode) {
        console.log('[getActivePeriode] Initialized Magang 1 successfully:', newPeriode)
        await supabase
          .from('profiles')
          .update({ active_periode_id: newPeriode.id })
          .eq('id', userId)
        return newPeriode
      }
    }

    console.log('[getActivePeriode] No active period or profile information to initialize from. Returning null gracefully.')
    return null
  } catch (err) {
    console.error('[getActivePeriode] Critical exception in getActivePeriode:', err)
    return null
  }
}

export async function switchPeriode(supabase: SupabaseClient, userId: string, periodeId: number): Promise<boolean> {
  try {
    // 1. Ambil data periode yang dituju
    const { data: periode, error: periodeErr } = await supabase
      .from('periode_magang')
      .select('*')
      .eq('id', periodeId)
      .maybeSingle()

    if (periodeErr || !periode) {
      console.error('Target periode not found:', periodeErr)
      return false
    }

    // 2. Update profiles: set active_periode_id dan sinkronkan kolom-kolom magang utama
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        active_periode_id: periodeId,
        instansi_magang: periode.nama_instansi,
        unit_magang: periode.unit_divisi,
        dosen_id: periode.dosen_id,
        tanggal_mulai: periode.tanggal_mulai,
        tanggal_selesai: periode.tanggal_selesai
      })
      .eq('id', userId)

    if (updateErr) {
      console.error('Failed to switch active period in profile:', updateErr)
      return false
    }

    return true
  } catch (err) {
    console.error('Runtime error switchPeriode:', err)
    return false
  }
}

export async function checkMagang1Selesai(supabase: SupabaseClient, userId: string): Promise<boolean> {
  try {
    // 1. Cari record periode_magang nomor_periode 1
    const { data: periode1, error: pError } = await supabase
      .from('periode_magang')
      .select('*')
      .eq('mahasiswa_id', userId)
      .eq('nomor_periode', 1)
      .maybeSingle()

    if (pError) {
      console.error('Error fetching Magang 1:', pError)
    }

    if (!periode1) return false

    // Jika sudah ditandai 'selesai', return true
    if (periode1.status === 'selesai') return true

    // 2. Cek apakah berkas Laporan Akhir (urutan=10) sudah Diverifikasi
    const { data: jenisBerkas, error: jbError } = await supabase
      .from('jenis_berkas')
      .select('id')
      .eq('urutan', 10)
      .maybeSingle()

    if (jbError || !jenisBerkas) return false

    const { data: berkas, error: bError } = await supabase
      .from('berkas')
      .select('status')
      .eq('mahasiswa_id', userId)
      .eq('jenis_berkas_id', jenisBerkas.id)
      .eq('periode_id', periode1.id)
      .maybeSingle()

    if (bError) {
      console.error('Error checking Laporan Akhir status:', bError)
    }

    if (berkas && berkas.status === 'Diverifikasi') {
      // Update status periode1 menjadi selesai di DB
      await supabase
        .from('periode_magang')
        .update({ status: 'selesai' })
        .eq('id', periode1.id)
      return true
    }

    return false
  } catch (err) {
    console.error('Runtime error checkMagang1Selesai:', err)
    return false
  }
}

export async function createPeriode2(
  supabase: SupabaseClient,
  userId: string,
  data: {
    nama_instansi: string
    jenis_instansi: string
    unit_divisi: string
    dosen_id: string
    tanggal_mulai: string
    tanggal_selesai?: string
  }
): Promise<PeriodeMagang | null> {
  try {
    // 1. Validasi Magang 1 harus sudah selesai
    const magang1Selesai = await checkMagang1Selesai(supabase, userId)
    if (!magang1Selesai) {
      throw new Error('Magang 1 belum selesai. Silakan selesaikan dan verifikasi Laporan Akhir terlebih dahulu.')
    }

    // 2. Hitung tanggal_selesai jika tidak ada (default 3 bulan)
    let tglSelesai = data.tanggal_selesai || null
    if (!tglSelesai && data.tanggal_mulai) {
      const start = new Date(data.tanggal_mulai)
      start.setMonth(start.getMonth() + 3)
      tglSelesai = start.toISOString().split('T')[0]
    }

    // 3. Masukkan record Magang 2
    const { data: newPeriode, error: insertErr } = await supabase
      .from('periode_magang')
      .insert([{
        mahasiswa_id: userId,
        nomor_periode: 2,
        nama_instansi: data.nama_instansi,
        jenis_instansi: data.jenis_instansi,
        unit_divisi: data.unit_divisi,
        dosen_id: data.dosen_id,
        tanggal_mulai: data.tanggal_mulai,
        tanggal_selesai: tglSelesai,
        status: 'aktif'
      }])
      .select()
      .single()

    if (insertErr || !newPeriode) {
      throw insertErr || new Error('Gagal membuat record Magang 2')
    }

    // 4. Set sebagai active periode di profiles dan sinkronkan field
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        active_periode_id: newPeriode.id,
        instansi_magang: newPeriode.nama_instansi,
        unit_magang: newPeriode.unit_divisi,
        dosen_id: newPeriode.dosen_id,
        tanggal_mulai: newPeriode.tanggal_mulai,
        tanggal_selesai: newPeriode.tanggal_selesai
      })
      .eq('id', userId)

    if (updateErr) {
      console.error('Failed to update active period to Magang 2:', updateErr)
    }

    return newPeriode
  } catch (err: any) {
    console.error('Runtime error createPeriode2:', err)
    throw err
  }
}
