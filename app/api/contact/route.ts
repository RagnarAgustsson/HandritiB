import { NextRequest, NextResponse } from 'next/server'
import { createContactMessage } from '@/lib/db/contacts'

export async function POST(request: NextRequest) {
  let body: { email?: string; message?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ villa: 'Ógild fyrirspurn' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!email || !email.includes('@')) {
    return NextResponse.json({ villa: 'Netfang vantar' }, { status: 400 })
  }

  if (!message || message.length > 2000) {
    return NextResponse.json({ villa: 'Skilaboð vantar eða of löng (hámark 2000 stafir)' }, { status: 400 })
  }

  await createContactMessage(email, message)

  return NextResponse.json({ ok: true })
}
