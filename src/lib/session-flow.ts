import type { SupabaseClient } from '@supabase/supabase-js'
import { readTodayPreSessionReadiness } from '@/lib/readiness-storage'
import { readLatestPreSessionReadinessLog } from '@/lib/readiness-log'

export async function hasPreSessionCheckinToday(supabase: SupabaseClient, userId: string) {
  try {
    const data = await readLatestPreSessionReadinessLog(supabase, userId)
    return Boolean(data) || Boolean(readTodayPreSessionReadiness())
  } catch (error) {
    const localSnapshot = readTodayPreSessionReadiness()
    if (localSnapshot) {
      return true
    }
    throw error
  }
}
