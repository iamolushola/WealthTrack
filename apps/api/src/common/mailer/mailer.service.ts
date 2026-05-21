import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transporter!: Transporter;
  private from = '"WealthTrack" <noreply@wealthtrack.app>';

  onModuleInit(): void {
    const host = process.env.MAILGUN_SMTP_HOST ?? 'smtp.mailgun.org';
    const port = Number(process.env.MAILGUN_SMTP_PORT ?? 587);
    const user = process.env.MAILGUN_SMTP_USERNAME ?? '';
    const pass = process.env.MAILGUN_SMTP_PASSWORD ?? '';
    const fromEmail = process.env.SMTP_FROM_EMAIL ?? 'noreply@wealthtrack.app';
    const fromName = process.env.SMTP_FROM_NAME ?? 'WealthTrack';

    this.transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    this.from = `"${fromName}" <${fromEmail}>`;

    if (!user || !pass) {
      this.logger.warn('SMTP credentials not configured — emails will not be sent');
    }
  }

  async sendMail(opts: SendMailOptions): Promise<void> {
    if (!process.env.MAILGUN_SMTP_USERNAME || !process.env.MAILGUN_SMTP_PASSWORD) {
      this.logger.warn(`[SMTP not configured] Would have sent "${opts.subject}" to ${opts.to}`);
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
      this.logger.log(`Email sent to ${opts.to} | subject: "${opts.subject}" | messageId: ${info.messageId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send email to ${opts.to} | subject: "${opts.subject}" | error: ${message}`);
      // Don't rethrow — email failure should not break the API response
    }
  }
}
