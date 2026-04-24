import type { SupabaseClient } from '@supabase/supabase-js'

export const DEFAULT_BASIC_DAILY_ROUTINE_LIMIT = 2

function parsePositiveInteger(value: string | null | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export async function readBasicDailyRoutineLimit(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'basic_daily_routine_limit')
    .maybeSingle<{ value?: string | null }>()

  if (error) {
    return DEFAULT_BASIC_DAILY_ROUTINE_LIMIT
  }

  return parsePositiveInteger(data?.value, DEFAULT_BASIC_DAILY_ROUTINE_LIMIT)
}
