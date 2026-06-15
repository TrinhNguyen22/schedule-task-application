import { randomUUID } from 'crypto';
import nodemailer from 'nodemailer';
import { getEnv } from '../config/env';
import { AppError } from '../errors/AppError';
import { ERROR_CODES } from '../errors/errorCodes';
import type { EmailResult, TaskHandler } from '../types/task.types';
import { getLogger } from '../utils/logger';
import { emailPayloadSchema } from '../validators/payloads/email.schema';

export class EmailHandler implements TaskHandler {
  private readonly log = getLogger({ component: 'EmailHandler' });

  async execute(payload: Record<string, unknown>): Promise<EmailResult> {
    const { to, cc, subject, body } = emailPayloadSchema.parse(payload);
    const env = getEnv();
    const sentAt = new Date().toISOString();

    if (env.EMAIL_MODE === 'mock') {
      const messageId = `mock-${randomUUID()}`;
      this.log.info(
        { messageId, to, subject, status: 'mocked' },
        'Email mocked (SMTP not configured)',
      );
      return {
        messageId,
        sentAt,
        status: 'mocked',
        recipients: to,
      };
    }

    if (!env.SMTP_HOST || !env.SMTP_PORT) {
      throw new AppError(
        ERROR_CODES.EMAIL_SEND_FAILED,
        'SMTP_HOST and SMTP_PORT are required when EMAIL_MODE=smtp',
        500,
        false,
      );
    }

    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE ?? false,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });

    try {
      const info = await transporter.sendMail({
        from: env.SMTP_FROM,
        to: to.join(', '),
        cc: cc?.join(', '),
        subject,
        text: body,
      });

      this.log.info(
        { messageId: info.messageId, to, subject, status: 'sent' },
        'Email sent successfully',
      );

      return {
        messageId: info.messageId,
        sentAt,
        status: 'sent',
        recipients: to,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Email send failed';
      this.log.error({ err: error, to, subject }, 'Email send failed');
      throw new AppError(ERROR_CODES.EMAIL_SEND_FAILED, message, 502, true);
    }
  }
}

export const emailHandler = new EmailHandler();
