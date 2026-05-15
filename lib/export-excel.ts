import * as XLSX from 'xlsx-js-style'
import { supabase } from '@/lib/supabase'

export async function exportLaporanExcel(user: any) {
  // Fetch Profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) throw new Error('Profil tidak ditemukan')

  // Fetch Absensi
  const { data: absensi } = await supabase.from('absensi').select('*').eq('mahasiswa_id', user.id).order('tanggal', { ascending: true })
  
  // Fetch Kegiatan
  let kegiatan: any[] = []
  if (profile.nim) {
    const { data: k } = await supabase.from('Kegiatan').select('*').eq('nim', profile.nim).order('tanggal', { ascending: true })
    if (k) kegiatan = k
  }

  // Fetch Berkas
  const { data: berkas } = await supabase.from('berkas').select('*').eq('mahasiswa_id', user.id)

  const wb = XLSX.utils.book_new()

  // Helper for Header Styles
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "137333" } }, // Brand Green
    alignment: { horizontal: "center", vertical: "center" }
  }

  function applyHeaderStyle(ws: XLSX.WorkSheet, headerCount: number) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ c: C, r: 0 })
      if (!ws[address]) continue
      ws[address].s = headerStyle
    }
  }

  // Format Date Helper DD/MM/YYYY
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-GB') // DD/MM/YYYY
  }

  // Calculate Absensi Summary
  let hadir = 0, izin = 0, sakit = 0, alpha = 0
  absensi?.forEach(a => {
    if (a.status === 'Hadir') hadir++
    else if (a.status === 'Izin') izin++
    else if (a.status === 'Sakit') sakit++
    else alpha++
  })

  let totalHari = 150
  if (profile.tanggal_mulai && profile.tanggal_selesai) {
    const start = new Date(profile.tanggal_mulai)
    const end = new Date(profile.tanggal_selesai)
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
      let count = 0
      let current = new Date(start)
      while (current <= end) {
        const day = current.getDay()
        if (day !== 0 && day !== 6) count++
        current.setDate(current.getDate() + 1)
      }
      totalHari = count
    }
  }

  const persentase = totalHari > 0 ? Math.min(Math.round((hadir / totalHari) * 100), 100) : 0

  // SHEET 1: Ringkasan
  const wsRingkasanData = [
    ["RINGKASAN LAPORAN MAGANG ORBIT"],
    ["Tanggal Generate", formatDate(new Date().toISOString())],
    [""],
    ["Nama Mahasiswa", profile.nama_lengkap],
    ["NIM", profile.nim],
    ["Instansi Magang", profile.instansi_magang],
    ["Total Hari Magang Target", totalHari],
    ["Kehadiran", hadir],
    ["Persentase Kehadiran", `${persentase}%`],
    ["Total Berkas Diunggah", berkas?.length || 0],
    ["Total Jurnal Kegiatan", kegiatan?.length || 0]
  ]
  const wsRingkasan = XLSX.utils.aoa_to_sheet(wsRingkasanData)
  wsRingkasan['A1'].s = { font: { bold: true, sz: 14, color: { rgb: "137333" } } }
  wsRingkasan['!cols'] = [{ wch: 25 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, wsRingkasan, "Ringkasan")

  // SHEET 2: Profil Mahasiswa
  const wsProfilData = [
    {
      "Nama": profile.nama_lengkap,
      "NIM": profile.nim,
      "Email": user.email,
      "Universitas": profile.universitas,
      "Program Studi": profile.prodi,
      "Instansi Magang": profile.instansi_magang,
      "Divisi/Unit": profile.unit_magang,
      "Periode Mulai": formatDate(profile.tanggal_mulai),
      "Periode Selesai": formatDate(profile.tanggal_selesai)
    }
  ]
  const wsProfil = XLSX.utils.json_to_sheet(wsProfilData)
  applyHeaderStyle(wsProfil, 9)
  wsProfil['!cols'] = [{wch: 25}, {wch: 20}, {wch: 30}, {wch: 25}, {wch: 20}, {wch: 30}, {wch: 20}, {wch: 15}, {wch: 15}]
  XLSX.utils.book_append_sheet(wb, wsProfil, "Profil Mahasiswa")

  // SHEET 3: Rekap Absensi
  const wsAbsensiData = (absensi || []).map(a => {
    const d = new Date(a.tanggal)
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    return {
      "Tanggal": formatDate(a.tanggal),
      "Hari": isNaN(d.getTime()) ? '-' : days[d.getDay()],
      "Jam Masuk": a.jam_masuk || '-',
      "Jam Keluar": a.jam_keluar || '-',
      "Status": a.status,
      "Catatan": a.catatan || '-'
    }
  })
  
  // Add summary row at the bottom
  wsAbsensiData.push({
    "Tanggal": "SUMMARY",
    "Hari": `Hadir: ${hadir}`,
    "Jam Masuk": `Izin: ${izin}`,
    "Jam Keluar": `Sakit: ${sakit}`,
    "Status": `Alpha: ${alpha}`,
    "Catatan": `Persentase: ${persentase}%`
  })

  const wsAbsensi = XLSX.utils.json_to_sheet(wsAbsensiData)
  applyHeaderStyle(wsAbsensi, 6)
  wsAbsensi['!cols'] = [{wch: 15}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 15}, {wch: 30}]
  
  // Style summary row
  const summaryRowIndex = wsAbsensiData.length
  for (let c = 0; c < 6; c++) {
    const address = XLSX.utils.encode_cell({ c: c, r: summaryRowIndex })
    if (wsAbsensi[address]) {
      wsAbsensi[address].s = { font: { bold: true }, fill: { fgColor: { rgb: "E8F0FE" } } }
    }
  }

  XLSX.utils.book_append_sheet(wb, wsAbsensi, "Rekap Absensi")

  // SHEET 4: Jurnal Kegiatan
  const wsJurnalData = kegiatan.map(k => ({
    "Tanggal": formatDate(k.tanggal),
    "Kegiatan": k.kegiatan,
    "Status": k.status,
    "Komentar Dosen": k.komentar_dosen || '-'
  }))
  const wsJurnal = XLSX.utils.json_to_sheet(wsJurnalData)
  applyHeaderStyle(wsJurnal, 4)
  wsJurnal['!cols'] = [{wch: 15}, {wch: 50}, {wch: 15}, {wch: 40}]
  XLSX.utils.book_append_sheet(wb, wsJurnal, "Jurnal Kegiatan")

  // SHEET 5: Berkas Magang
  const wsBerkasData = (berkas || []).map(b => ({
    "Nama Dokumen": b.document_type,
    "Status": "Sudah Diupload ✅",
    "Nama File": b.file_name || '-',
    "Ukuran": b.file_size ? `${(b.file_size / 1024 / 1024).toFixed(2)} MB` : '-',
    "Tanggal Upload": formatDate(b.uploaded_at),
    "URL File": b.file_url
  }))
  const wsBerkas = XLSX.utils.json_to_sheet(wsBerkasData)
  applyHeaderStyle(wsBerkas, 6)
  wsBerkas['!cols'] = [{wch: 35}, {wch: 20}, {wch: 30}, {wch: 15}, {wch: 15}, {wch: 50}]
  XLSX.utils.book_append_sheet(wb, wsBerkas, "Berkas Magang")

  // Save the file
  const fileName = `Laporan_Magang_${profile.nim}_${profile.nama_lengkap.replace(/\s+/g, '_')}.xlsx`
  XLSX.writeFile(wb, fileName)
}
