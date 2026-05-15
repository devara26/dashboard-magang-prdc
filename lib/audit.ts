import { supabase } from './supabase'

export async function logAction(action: string, details?: string, targetId?: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: action,
      details: details || '',
      target_id: targetId || null,
      ip_address: null, // Can be added if needed via client-side detection or server-side
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Audit Log Error:', error)
  }
}
