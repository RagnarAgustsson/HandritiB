import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'

const PADDLE_API = 'https://api.paddle.com'

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })
  }

  const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID
  const apiKey = process.env.PADDLE_API_KEY
  if (!priceId || !apiKey) {
    return NextResponse.json({ villa: 'Greiðslukerfi ekki stillt' }, { status: 500 })
  }

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  const origin = request.headers.get('origin') || request.nextUrl.origin
  const body = await request.json().catch(() => ({}))
  const locale = body.locale || 'is'

  console.log('[Paddle] Creating transaction:', { priceId, userId })

  try {
    const res = await fetch(`${PADDLE_API}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        custom_data: { userId },
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      const errMsg = json?.error?.detail || json?.error?.message || JSON.stringify(json?.error) || 'Paddle API error'
      console.error('[Paddle] API error:', res.status, errMsg, JSON.stringify(json))
      return NextResponse.json({ villa: errMsg }, { status: 500 })
    }

    let checkoutUrl = json.data?.checkout?.url
    if (!checkoutUrl) {
      console.error('[Paddle] No checkout URL in response:', JSON.stringify(json.data?.checkout))
      return NextResponse.json({ villa: 'Engin greiðsluslóð' }, { status: 500 })
    }

    // Append customer email and success redirect
    const url = new URL(checkoutUrl)
    if (email) url.searchParams.set('customer_email', email)
    url.searchParams.set('success_url', `${origin}/${locale}/subscription?success=true`)
    checkoutUrl = url.toString()

    return NextResponse.json({ checkoutUrl })
  } catch (err: any) {
    console.error('[Paddle] Transaction create failed:', err?.message)
    return NextResponse.json(
      { villa: 'Tókst ekki að stofna greiðslu' },
      { status: 500 }
    )
  }
}
