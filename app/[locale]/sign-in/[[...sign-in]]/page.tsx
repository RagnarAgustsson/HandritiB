import { SignIn } from '@clerk/nextjs'
import { setRequestLocale } from 'next-intl/server'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function InnskráningPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <SignIn />
    </div>
  )
}
