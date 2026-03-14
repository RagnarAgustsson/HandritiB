import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

// Generate a client token for direct blob upload — no webhook callback needed
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })

  try {
    const { pathname } = await request.json()

    const clientToken = await generateClientTokenFromReadWriteToken({
      pathname: pathname || `uploads/${userId}/${Date.now()}`,
      allowedContentTypes: [
        'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/x-m4a',
        'audio/wav', 'audio/webm', 'audio/ogg', 'audio/flac',
        'video/mp4', 'video/webm',
      ],
      maximumSizeInBytes: 25 * 1024 * 1024,
      validUntil: Date.now() + 30 * 60 * 1000, // 30 minutes
    })

    return NextResponse.json({ clientToken })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token villa'
    return NextResponse.json({ villa: message }, { status: 500 })
  }
}
