import type { SupabaseClient } from '@supabase/supabase-js'
import { readTodayPreSessionReadiness } from '@/lib/readiness-storage'

function startOfTodayIso() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.toISOString()
}

export async function hasPreSessionCheckinToday(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('readiness_logs')
    .select('id,checked_at')
    .eq('user_id', userId)
    .eq('checkin_type', 'pre')
    .gte('checked_at', startOfTodayIso())
    .order('checked_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    const localSnapshot = readTodayPreSessionReadiness()
    if (localSnapshot) {
      return true
    }
    throw error
  }

  return Boolean(data) || Boolean(readTodayPreSessionReadiness())
}
