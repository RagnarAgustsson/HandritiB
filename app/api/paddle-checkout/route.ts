import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { paddle } from '@/lib/paddle/client'

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID
  if (!priceId) {
    return NextResponse.json({ error: 'Price not configured' }, { status: 500 })
  }

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  // Build success URL from request origin
  const origin = request.headers.get('origin') || request.nextUrl.origin
  const body = await request.json().catch(() => ({}))
  const locale = body.locale || 'is'

  try {
    const transaction = await paddle.transactions.create({
      items: [{ priceId, quantity: 1 }],
      customData: { userId } as any,
    })

    let checkoutUrl = transaction.checkout?.url
    if (!checkoutUrl) {
      return NextResponse.json({ error: 'No checkout URL returned' }, { status: 500 })
    }

    // Append customer email and success redirect as query params
    const url = new URL(checkoutUrl)
    if (email) url.searchParams.set('customer_email', email)
    url.searchParams.set('success_url', `${origin}/${locale}/subscription?success=true`)
    checkoutUrl = url.toString()

    return NextResponse.json({ checkoutUrl })
  } catch (err: any) {
    console.error('[Paddle] Transaction create failed:', {
      message: err?.message,
      code: err?.code,
      status: err?.statusCode,
      type: err?.type,
      detail: err?.detail,
      raw: JSON.stringify(err, null, 2),
    })
    return NextResponse.json(
      { error: err?.message || 'Failed to create checkout' },
      { status: 500 }
    )
  }
}
