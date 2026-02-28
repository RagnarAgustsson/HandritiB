import { SignUp } from '@clerk/nextjs'

export default function NýskráningPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <SignUp />
    </div>
  )
}
