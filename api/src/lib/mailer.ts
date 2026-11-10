import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../env.js";
import type { Mail } from "./emails.js";

// Same approach as BorrowVault: direct SMTP (Gmail app password, SMTP_* in
// env.ts) when SMTP_USER+SMTP_PASS are set; otherwise the shared org gateway
// (3pandalabs/mailer, app key "taskvault"); with neither, mail is disabled.
// Templates live in lib/emails.ts.
//
// EVERY send fails soft: logged and counted, never thrown.

export type { Mail } from "./emails.js";

export type SendResult = { delivered: number; failed: number; skipped: number };

function smtpConfigured(): boolean {
  return Boolean(env.SMTP_USER && env.SMTP_PASS);
}

export function mailerConfigured(): boolean {
  return smtpConfigured() || Boolean(env.MAILER_URL && env.MAILER_TOKEN);
}

let transport: Transporter | null = null;
function smtp(): Transporter {
  transport ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    requireTLS: env.SMTP_PORT !== 465, // never send credentials in clear on 587
    // Google shows app passwords as four groups; spaces are not part of it.
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS.replace(/\s+/g, "") },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transport;
}

async function sendViaSmtp(messages: Mail[], log: (msg: string) => void): Promise<SendResult> {
  const from = { name: env.EMAIL_FROM_NAME || "TaskVault", address: env.SMTP_USER };
  let delivered = 0;
  let failed = 0;
  for (const m of messages) {
    try {
      await smtp().sendMail({ from, to: m.to, subject: m.subject, html: m.html, text: m.text });
      delivered++;
    } catch (err) {
      // The error class only: SMTP errors can echo the recipient address.
      log(`smtp send failed: ${(err as Error)?.name ?? "error"} ${(err as { code?: string })?.code ?? ""}`.trim());
      failed++;
    }
  }
  if (delivered) log(`smtp sent ${delivered} message(s)`);
  return { delivered, failed, skipped: 0 };
}

const BATCH = 50;

export async function sendMail(messages: Mail[], log: (msg: string) => void): Promise<SendResult> {
  if (messages.length === 0) return { delivered: 0, failed: 0, skipped: 0 };
  if (!mailerConfigured()) {
    log(`mail disabled; ${messages.length} message(s) skipped`);
    return { delivered: 0, failed: 0, skipped: messages.length };
  }
  if (smtpConfigured()) return sendViaSmtp(messages, log);

  let delivered = 0;
  let failed = 0;
  for (let i = 0; i < messages.length; i += BATCH) {
    const batch = messages.slice(i, i + BATCH);
    try {
      const res = await fetch(`${env.MAILER_URL.replace(/\/$/, "")}/send`, {
        method: "POST",
        headers: { authorization: `Bearer ${env.MAILER_TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify({
          app: "taskvault",
          messages: batch.map((m) => ({
            to: m.to,
            fromName: env.EMAIL_FROM_NAME || "TaskVault",
            subject: m.subject,
            html: m.html,
            text: m.text,
          })),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        log(`mailer gateway error ${res.status}`);
        failed += batch.length;
        continue;
      }
      const result = (await res.json()) as { delivered?: number; failed?: number };
      delivered += result.delivered ?? 0;
      failed += result.failed ?? 0;
    } catch (err) {
      log(`mailer gateway unreachable: ${(err as Error)?.name ?? "error"}`);
      failed += batch.length;
    }
  }
  return { delivered, failed, skipped: 0 };
}
