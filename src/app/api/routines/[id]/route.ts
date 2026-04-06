import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { error: 'The routine-by-id API is not implemented yet.' },
    { status: 501 },
  )
}
