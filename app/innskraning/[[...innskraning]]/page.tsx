import { SignIn } from '@clerk/nextjs'

export default function InnskráningPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <SignIn />
    </div>
  )
}
