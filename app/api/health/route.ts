import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Build ID is set at build time — changes on every deploy
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || 'dev'

export async function GET() {
  const { userId } = await auth()

  return NextResponse.json({
    ok: true,
    auth: !!userId,
    buildId: BUILD_ID,
  })
}
