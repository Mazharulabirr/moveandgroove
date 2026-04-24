import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_BASIC_DAILY_ROUTINE_LIMIT, readBasicDailyRoutineLimit } from '@/lib/app-config'
import { requireAdminAccess } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const { serviceClient } = await requireAdminAccess(req)
    const value = await readBasicDailyRoutineLimit(serviceClient as never)
    return NextResponse.json({
      key: 'basic_daily_routine_limit',
      value,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message.includes('Admin') || message.includes('authenticated') || message.includes('token') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { serviceClient } = await requireAdminAccess(req)
    const body = await req.json() as { value?: number | string | null }
    const nextValue = Number.parseInt(String(body.value ?? DEFAULT_BASIC_DAILY_ROUTINE_LIMIT), 10)

    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      return NextResponse.json({ error: 'Invalid config value.' }, { status: 400 })
    }

    const { error } = await serviceClient
      .from('app_config')
      .upsert([{
        key: 'basic_daily_routine_limit',
        value: String(nextValue),
        updated_at: new Date().toISOString(),
      }], {
        onConflict: 'key',
      })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      key: 'basic_daily_routine_limit',
      value: nextValue,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message.includes('Admin') || message.includes('authenticated') || message.includes('token') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
