import { Resend } from 'resend';

/**
 * Remitente de los correos transaccionales.
 *
 * Resend sólo acepta enviar desde un dominio verificado en la cuenta. A
 * 2026-09-10 `madlayerz.cl` no tiene ningún registro TXT (ni DKIM ni SPF), así
 * que cualquier envío desde `@madlayerz.cl` es rechazado. Por eso el remitente
 * es configurable: se cambia por env var en Vercel sin tocar el código.
 */
export const RESEND_FROM = process.env.RESEND_FROM ?? 'MadLayerz <notificaciones@madlayerz.cl>';

/** Dónde recibe MadLayerz los avisos internos (pedidos y cotizaciones). */
export const NOTIFICATION_EMAIL = process.env.QUOTE_NOTIFICATION_EMAIL;

export function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/**
 * Envuelve un envío para que un fallo de correo nunca tumbe la petición, pero
 * tampoco desaparezca en silencio: antes el `.catch()` se tragaba el error y no
 * había forma de saber que los correos jamás salieron.
 */
export async function sendEmailSafely(
  label: string,
  send: (resend: Resend) => Promise<{ error?: unknown } | void>
): Promise<void> {
  const resend = getResend();

  if (!resend) {
    console.warn(`[email] ${label}: RESEND_API_KEY no está configurada, no se envió nada.`);
    return;
  }

  try {
    const result = await send(resend);
    if (result && 'error' in result && result.error) {
      console.error(`[email] ${label}: Resend rechazó el envío`, result.error);
    }
  } catch (error) {
    console.error(`[email] ${label}: fallo al enviar`, error);
  }
}
