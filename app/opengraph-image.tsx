import { ImageResponse } from 'next/og'

export const alt = 'Handriti — AI transcription and summary'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #09090b 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          }}
        />

        {/* Icon */}
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          width="80"
          height="80"
        >
          <rect width="64" height="64" rx="14" fill="#4f46e5" />
          <path d="M16 10 L16 54" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" />
          <path d="M48 10 L48 54" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" />
          <path d="M16 32 Q24 17, 32 32 Q40 47, 48 32" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </svg>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: '#f4f4f5',
            marginTop: 24,
            letterSpacing: '-0.02em',
          }}
        >
          Handriti
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#a1a1aa',
            marginTop: 12,
          }}
        >
          AI transcription & summary
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 20,
            color: '#71717a',
          }}
        >
          handriti.is
        </div>
      </div>
    ),
    { ...size }
  )
}
