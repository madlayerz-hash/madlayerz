import Link from 'next/link';
import { CONTACT, SITE_NAME, whatsappUrl } from '@/lib/site';

const linkClass = 'text-muted transition-colors hover:text-[color:var(--heading)]';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-surface px-6 py-12 text-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:justify-between">
        <div>
          <p className="text-base font-semibold tracking-tight" style={{ color: 'var(--heading)' }}>
            {SITE_NAME}
          </p>
          <p className="mt-2 max-w-xs font-mono text-xs text-muted">Impresión 3D · Chile</p>
        </div>

        <nav aria-label="Enlaces del sitio" className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Tienda</p>
          <Link href="/catalogo" className={linkClass}>Catálogo</Link>
          <Link href="/cotizacion" className={linkClass}>Pedir cotización</Link>
          <Link href="/cuenta" className={linkClass}>Mi cuenta</Link>
        </nav>

        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Contacto</p>
          <a href={whatsappUrl('Hola, quiero consultar por un producto')} target="_blank" rel="noreferrer" className={linkClass}>
            WhatsApp
          </a>
          <a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noreferrer" className={linkClass}>
            Instagram
          </a>
          <a href={`mailto:${CONTACT.email}`} className={linkClass}>
            {CONTACT.email}
          </a>
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-6xl font-mono text-xs text-muted">
        © {new Date().getFullYear()} {SITE_NAME}. Todos los derechos reservados.
      </p>
    </footer>
  );
}
