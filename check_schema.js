const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
let supabaseUrl, supabaseKey;
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const lines = envContent.split('\n');
  for (let line of lines) {
    const [key, ...valueParts] = line.trim().split('=');
    if (!key) continue;
    const val = valueParts.join('=').replace(/['"]/g, '');
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
    if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseKey = val;
  }
} catch (e) {
  console.error("Error reading .env.local:", e);
}

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(name) {
  try {
    const { data, error } = await supabase.from(name).select('*').limit(1);
    if (error) {
      return { name, exists: false, error: error.message };
    }
    return { name, exists: true, data };
  } catch (err) {
    return { name, exists: false, error: err.message };
  }
}

async function check() {
  const tables = [
    'profiles', 'absensi', 'Kegiatan', 'penilaian',
    'dosen_codes', 'verification_codes', 'dosen_verification',
    'access_codes', 'system_settings', 'settings', 'verification'
  ];
  console.log("Checking tables...");
  for (let t of tables) {
    const res = await checkTable(t);
    if (res.exists) {
      console.log(`Table "${t}" EXISTS! Samples:`, res.data);
    } else {
      console.log(`Table "${t}" does not exist/error:`, res.error);
    }
  }
}

check();
