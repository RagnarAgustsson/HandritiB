import { ImageResponse } from 'next/og'

export async function GET() {
  return new ImageResponse(
    (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <rect width="64" height="64" rx="14" fill="#3730a3" />
        <path d="M16 10 L16 54" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" />
        <path d="M48 10 L48 54" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" />
        <path d="M16 32 Q24 17, 32 32 Q40 47, 48 32" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
    { width: 192, height: 192 }
  )
}
