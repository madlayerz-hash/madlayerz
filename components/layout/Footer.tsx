import Link from 'next/link';
import { CONTACT, SITE_NAME, whatsappUrl } from '@/lib/site';

export function Footer() {
  return (
    <footer className="glass-surface mt-16 px-6 py-10 text-sm">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 sm:flex-row sm:justify-between">
        <div>
          <p className="text-base font-bold" style={{ color: 'var(--heading)' }}>
            {SITE_NAME}
          </p>
          <p className="mt-1 max-w-xs opacity-80">Impresión 3D hecha con dedicación — Chile</p>
        </div>

        <nav aria-label="Enlaces del sitio" className="flex flex-col gap-2">
          <p className="font-semibold">Tienda</p>
          <Link href="/catalogo" className="opacity-80 hover:opacity-100">Catálogo</Link>
          <Link href="/cotizacion" className="opacity-80 hover:opacity-100">Pedir cotización</Link>
          <Link href="/cuenta" className="opacity-80 hover:opacity-100">Mi cuenta</Link>
        </nav>

        <div className="flex flex-col gap-2">
          <p className="font-semibold">Contacto</p>
          <a href={whatsappUrl('Hola, quiero consultar por un producto')} target="_blank" rel="noreferrer" className="opacity-80 hover:opacity-100">
            WhatsApp
          </a>
          <a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noreferrer" className="opacity-80 hover:opacity-100">
            Instagram
          </a>
          <a href={`mailto:${CONTACT.email}`} className="opacity-80 hover:opacity-100">
            {CONTACT.email}
          </a>
        </div>
      </div>

      <p className="mt-8 text-center opacity-60">
        © {new Date().getFullYear()} {SITE_NAME}. Todos los derechos reservados.
      </p>
    </footer>
  );
}
