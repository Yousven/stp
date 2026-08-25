import nodemailer, { type Transporter } from "nodemailer";
import { env, isEmailConfigured } from "../env.js";

let cachedTransport: Transporter | null = null;

function getTransport(): Transporter {
  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      // 465 on implicit TLS; 587 kasutab STARTTLS-i, mille nodemailer
      // lülitab ise sisse kui secure=false.
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return cachedTransport;
}

/**
 * Saadab e-kirja. Nagu push'i puhul: kui SMTP pole seadistatud, logitakse
 * ja jätkatakse — meeldetuletuste loogikat saab testida ilma mailiserverita.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.info(`[email] SMTP seadistamata — jätaks saatmata "${subject}" -> ${to}`);
    return false;
  }

  try {
    await getTransport().sendMail({ from: env.smtp.from, to, subject, text });
    return true;
  } catch (err) {
    console.error("[email] Saatmine ebaõnnestus:", err);
    return false;
  }
}
