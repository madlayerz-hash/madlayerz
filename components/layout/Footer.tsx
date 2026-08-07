export function Footer() {
  return (
    <footer className="glass-surface mt-16 px-6 py-8 text-sm">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="font-bold" style={{ color: 'var(--heading)' }}>MadLayerz</p>
        <p>Impresión 3D hecha con dedicación — Chile</p>
        <div className="flex gap-4">
          <a href="https://wa.me/56900000000" target="_blank" rel="noreferrer">WhatsApp</a>
          <a href="https://instagram.com/madlayerz" target="_blank" rel="noreferrer">Instagram</a>
          <a href="mailto:contacto@madlayerz.cl">contacto@madlayerz.cl</a>
        </div>
        <p className="opacity-60">© {new Date().getFullYear()} MadLayerz. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
