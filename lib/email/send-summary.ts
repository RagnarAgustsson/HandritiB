import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const from = process.env.EMAIL_FROM || 'Handriti <handriti@resend.dev>'

export async function sendSummaryEmail(
  to: string,
  sessionName: string,
  summary: string,
) {
  if (!process.env.RESEND_API_KEY) return

  await resend.emails.send({
    from,
    to,
    subject: `Samantekt: ${sessionName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #f4f4f5; font-size: 20px; margin-bottom: 4px;">${sessionName}</h2>
        <p style="color: #71717a; font-size: 13px; margin-bottom: 24px;">Samantekt frá Handriti</p>
        <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px;">
          <p style="color: #d4d4d8; font-size: 14px; line-height: 1.7; white-space: pre-wrap; margin: 0;">${summary}</p>
        </div>
        <p style="color: #52525b; font-size: 12px; margin-top: 24px;">— Handriti</p>
      </div>
    `.trim(),
  })
}
