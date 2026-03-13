import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'

const PADDLE_API = 'https://api.paddle.com'

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID
  const apiKey = process.env.PADDLE_API_KEY
  if (!priceId || !apiKey) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 500 })
  }

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  const origin = request.headers.get('origin') || request.nextUrl.origin
  const body = await request.json().catch(() => ({}))
  const locale = body.locale || 'is'

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
      console.error('[Paddle] API error:', res.status, JSON.stringify(json))
      return NextResponse.json(
        { error: json?.error?.detail || 'Paddle API error' },
        { status: 500 }
      )
    }

    let checkoutUrl = json.data?.checkout?.url
    if (!checkoutUrl) {
      console.error('[Paddle] No checkout URL in response:', JSON.stringify(json.data?.checkout))
      return NextResponse.json({ error: 'No checkout URL returned' }, { status: 500 })
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
      { error: 'Failed to create checkout' },
      { status: 500 }
    )
  }
}
