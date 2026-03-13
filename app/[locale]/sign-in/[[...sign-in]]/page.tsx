import { SignIn } from '@clerk/nextjs'
import { setRequestLocale } from 'next-intl/server'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function InnskráningPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-[400px] w-[400px] rounded-full bg-indigo-500/[0.07] blur-[100px]" />
      </div>
      <SignIn fallbackRedirectUrl={`/${locale}`} />
    </div>
  )
}
