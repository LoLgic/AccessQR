import { config } from '../config.js'

export interface MailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

/** Correos "enviados" cuando MAIL_TRANSPORT=memory (solo pruebas). */
export const outbox: MailMessage[] = []

export const mailerEnabled = (): boolean => config.mail.memory || Boolean(config.mail.host)

interface Transporter {
  sendMail(message: Record<string, unknown>): Promise<unknown>
}
let transporter: Transporter | undefined

export async function sendMail(message: MailMessage): Promise<void> {
  if (config.mail.memory) {
    outbox.push(message)
    return
  }
  if (!config.mail.host) throw new Error('SMTP no configurado.')

  // nodemailer se carga solo si hay SMTP configurado.
  if (!transporter) {
    const nodemailer = (await import('nodemailer')).default
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    })
  }
  await transporter.sendMail({ from: config.mail.from, ...message })
}

export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
