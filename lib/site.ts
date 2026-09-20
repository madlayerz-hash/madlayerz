/** Canonical origin, overridable per environment (preview deploys, local dev). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://madlayerz.cl').replace(/\/$/, '');

export const SITE_NAME = 'MadLayerz';
export const SITE_DESCRIPTION =
  'Llaveros, figuras, maceteros y juguetes impresos en 3D en Chile. Compra online o pide una pieza personalizada.';

/** Fallback for products whose image is missing or fails to load. */
export const PLACEHOLDER_IMAGE = '/products/placeholder.svg';

export function formatClp(amount: number): string {
  return `$${amount.toLocaleString('es-CL')}`;
}

/** Single place to edit the public contact details. */
export const CONTACT = {
  whatsapp: '+56945506614',
  instagram: 'madlayerz',
  email: 'madlayerz@gmail.com',
};

/** wa.me needs the number without +, spaces or dashes. */
export const whatsappUrl = (message?: string) =>
  `https://wa.me/${CONTACT.whatsapp.replace(/[^0-9]/g, '')}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
