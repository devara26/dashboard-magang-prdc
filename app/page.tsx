import { redirect } from 'next/navigation'

export default function HalamanUtama() {
  // Langsung arahkan pengguna ke halaman otentikasi
  redirect('/login')
}
