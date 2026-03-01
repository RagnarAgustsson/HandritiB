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
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px; background-color: #ffffff;">
        <h2 style="color: #18181b; font-size: 20px; margin: 0 0 4px 0;">${sessionName}</h2>
        <p style="color: #71717a; font-size: 13px; margin: 0 0 24px 0;">Samantekt frá Handriti</p>
        <div style="background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 12px; padding: 20px;">
          <p style="color: #27272a; font-size: 14px; line-height: 1.7; white-space: pre-wrap; margin: 0;">${summary}</p>
        </div>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 24px;">— Handriti</p>
      </div>
    `.trim(),
  })
}
