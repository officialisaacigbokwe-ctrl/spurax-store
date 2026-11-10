import nodemailer from "nodemailer";
import { BRAND } from "@/lib/brand";

let transporter: import("nodemailer").Transporter | null = null;

function getTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  return transporter;
}

// Stops customer-typed text from injecting HTML into an email.
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function emailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f3f3;font-family:Arial,Helvetica,sans-serif;color:#111;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f3;padding:24px 12px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:#000;color:#fff;padding:20px 28px;">
                <span style="font-size:18px;font-weight:bold;letter-spacing:3px;">${esc(BRAND.wordmark)}</span><br>
                <span style="font-size:10px;letter-spacing:4px;color:#aaaaaa;">${esc(BRAND.sublabel)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 16px;font-size:22px;">${esc(title)}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#fafafa;color:#888;font-size:12px;">
                ${esc(BRAND.name)}. Delivery is handled by the seller.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function button(href: string, label: string): string {
  return `<p style="margin:24px 0 0;"><a href="${esc(href)}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:bold;">${esc(label)}</a></p>`;
}

// Never throws: a failed email must never break a payment or an order.
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<boolean> {
  try {
    const client = getTransporter();

    if (!client) {
      console.warn("EMAIL NOT SENT: EMAIL_USER or EMAIL_APP_PASSWORD is missing.");
      return false;
    }

    const recipients = (Array.isArray(options.to) ? options.to : [options.to])
      .map((address) => (address || "").trim())
      .filter((address) => address.includes("@"));

    if (recipients.length === 0) {
      return false;
    }

    await client.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || "Spurax"}" <${process.env.EMAIL_USER}>`,
      to: recipients.join(", "),
      subject: options.subject,
      html: options.html,
    });

    console.log("EMAIL SENT:", options.subject);
    return true;
  } catch (error) {
    console.error("EMAIL ERROR:", error instanceof Error ? error.message : error);
    return false;
  }
}