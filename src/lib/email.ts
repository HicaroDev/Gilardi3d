import "server-only";
import { env } from "./env";

interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Envia e-mail pela API do Resend; sem chave configurada, registra no log (dev). */
export async function sendMail(mail: Mail) {
  const { RESEND_API_KEY, EMAIL_FROM } = env();
  if (!RESEND_API_KEY) {
    console.info(`[email:dev] Para: ${mail.to}\nAssunto: ${mail.subject}\n${mail.text}`);
    return { delivered: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: EMAIL_FROM ?? "Gilardi 3D <onboarding@resend.dev>",
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    }),
  });
  if (!res.ok) console.error("[email] falha no envio", res.status, await res.text().catch(() => ""));
  return { delivered: res.ok };
}
