'use client'

/**
 * Renders text with **bold** markers as <strong> elements.
 * Preserves whitespace and newlines (via whitespace-pre-wrap on parent).
 */
export default function FormattedText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <p className={className}>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className="font-semibold text-zinc-100">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  )
}
