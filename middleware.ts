import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { neon } from '@neondatabase/serverless'
import { NextResponse } from 'next/server'

const handleI18nRouting = createMiddleware(routing)

const isPublicRoute = createRouteMatcher([
  '/',
  '/:locale',
  '/:locale/sign-in(.*)',
  '/:locale/sign-up(.*)',
  '/:locale/terms',
  '/:locale/privacy',
  '/:locale/pricing',
  '/api/webhooks(.*)',
  '/api/contact',
  '/api/health',
])

async function isAdminUser(userId: string): Promise<boolean> {
  const url = process.env.DATABASE_URL
  if (!url) return false
  try {
    const sql = neon(url)
    const rows = await sql`SELECT 1 FROM admins WHERE user_id = ${userId} LIMIT 1`
    return rows.length > 0
  } catch {
    // If DB check fails during maintenance, deny admin bypass (fail closed)
    return false
  }
}

export default clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname

  // Maintenance mode — only activated when MAINTENANCE_MODE=true exactly
  if (process.env.MAINTENANCE_MODE === 'true') {
    // API routes are never blocked (webhooks, cron, health must keep working)
    const isApiRoute = pathname.startsWith('/api')
    // Avoid redirect loop
    const isMaintenancePage = pathname === '/maintenance'

    if (!isApiRoute && !isMaintenancePage) {
      // Check if current user is an admin — admins bypass maintenance
      const { userId } = await auth()
      const adminBypass = userId ? await isAdminUser(userId) : false

      if (!adminBypass) {
        return NextResponse.rewrite(new URL('/maintenance', request.url))
      }
    }
  }

  if (!isPublicRoute(request)) {
    await auth.protect()
  }

  // Don't apply i18n routing to API routes
  if (pathname.startsWith('/api')) {
    return
  }

  return handleI18nRouting(request)
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
