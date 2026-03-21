export const metadata = {
  title: 'Handriti — Í vinnslu',
  description: 'Handriti er að fara í glowup. Komdu aftur fljótlega!',
}

export default function MaintenancePage() {
  return (
    <html lang="is">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: '#09090b',
          color: '#fafafa',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <main
          style={{
            textAlign: 'center',
            padding: '2rem',
            maxWidth: '480px',
            width: '100%',
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              marginBottom: '2rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
              }}
            >
              ✦
            </div>
            <span
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#fafafa',
              }}
            >
              Handriti
            </span>
          </div>

          {/* Animated sparkle bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.375rem',
              marginBottom: '2rem',
            }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: '0.375rem',
                  height: '0.375rem',
                  borderRadius: '50%',
                  background: '#6366f1',
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>

          {/* Main heading */}
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              margin: '0 0 1rem',
              color: '#fafafa',
            }}
          >
            Handriti er að fara í glowup ✨
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '1.125rem',
              color: '#a1a1aa',
              lineHeight: 1.6,
              margin: '0 0 2rem',
            }}
          >
            Við erum að vinna í nýrri og betri útgáfu.
            <br />
            Komdu aftur fljótlega!
          </p>

          {/* Indigo divider accent */}
          <div
            style={{
              width: '3rem',
              height: '3px',
              background: 'linear-gradient(90deg, #6366f1, #818cf8)',
              borderRadius: '2px',
              margin: '0 auto',
            }}
          />
        </main>

        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.4; }
            50% { transform: scale(1.5); opacity: 1; }
          }
        `}</style>
      </body>
    </html>
  )
}
