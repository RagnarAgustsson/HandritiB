import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const from = process.env.EMAIL_FROM || 'Handriti <handriti@resend.dev>'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendSummaryEmail(
  to: string,
  sessionName: string,
  summary: string,
  yfirferd?: string,
) {
  if (!process.env.RESEND_API_KEY) return

  const safeName = escapeHtml(sessionName)
  const safeSummary = escapeHtml(summary)
  const safeYfirferd = yfirferd ? escapeHtml(yfirferd) : ''

  const yfirferdBlock = safeYfirferd ? `
        <h3 style="color: #18181b; font-size: 16px; margin: 0 0 12px 0;">Yfirferð</h3>
        <div style="background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="color: #27272a; font-size: 14px; line-height: 1.7; white-space: pre-wrap; margin: 0;">${safeYfirferd}</p>
        </div>
  ` : ''

  await resend.emails.send({
    from,
    to,
    subject: `Samantekt: ${safeName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px; background-color: #ffffff;">
        <h2 style="color: #18181b; font-size: 20px; margin: 0 0 4px 0;">${safeName}</h2>
        <p style="color: #71717a; font-size: 13px; margin: 0 0 24px 0;">Frá Handriti</p>
        ${yfirferdBlock}
        <h3 style="color: #18181b; font-size: 16px; margin: 0 0 12px 0;">Samantekt</h3>
        <div style="background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 12px; padding: 20px;">
          <p style="color: #27272a; font-size: 14px; line-height: 1.7; white-space: pre-wrap; margin: 0;">${safeSummary}</p>
        </div>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 24px;">— Handriti</p>
      </div>
    `.trim(),
  })
}
