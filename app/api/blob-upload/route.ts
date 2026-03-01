import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const { userId } = await auth()
        if (!userId) throw new Error('Ekki innskráður')

        return {
          allowedContentTypes: [
            'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a',
            'audio/wav', 'audio/webm', 'audio/ogg', 'audio/flac',
            'video/mp4', 'video/webm',
          ],
          maximumSizeInBytes: 25 * 1024 * 1024, // 25MB — OpenAI limit
        }
      },
      onUploadCompleted: async () => {
        // Nothing needed — the client will trigger processing via /api/hljod-skra
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload villa'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
