# Logo animado — 21 sep 2026

**En producción** (deploy `c91a228`, Ready al primer intento).

Logo: cabezal de impresora 3D sobre una pieza impresa por capas. Se vectorizó desde el PNG que
entregó Pablo (97 % de coincidencia píxel a píxel) y se separó en tres piezas animables.

## Archivos

- `components/brand/logo-paths.ts` — trazados: `LOGO_NOZZLE` (riel + boquilla + vástago),
  `LOGO_TIP` (punta), `LOGO_OBJECT` (pieza). viewBox `128 128 768 768`.
- `components/brand/Logo.tsx` — `<Logo variant="hero" | "mark" | "static" />`. Hereda el color
  con `currentColor`; ids de clipPath únicos con `useId` (el logo aparece dos veces en la home).
- `app/globals.css` — keyframes `ml-*` y token `--logo-glow` (verde en claro, casi blanco en
  oscuro). Todo se apaga con `prefers-reduced-motion`.
- `app/icon.svg` (favicon vectorial que cambia de color con el tema del navegador),
  `app/favicon.ico`, `app/apple-icon.png`, `public/products/placeholder.svg`.

## Animación

- **Hero, al cargar:** baja el cabezal → la pieza se imprime de abajo hacia arriba en 9 saltos
  (= la separación entre capas del dibujo) con la punta encendida → la punta se enfría.
- **Hero, en reposo (ciclo de 5 s):** la boquilla baja como si extruyera, la punta brilla y una
  franja de luz sube recorriendo las capas.
- **Header:** estático; se reimprime al hacer hover o foco sobre el enlace `.ml-brand`.
