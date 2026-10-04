# Rediseño de la home — «Taller nocturno»

Fecha: 4 oct 2026 · Rama: `rediseno-home` · Estado: diseño aprobado, pendiente de plan.

## Objetivo

Rehacer la página de inicio de madlayerz.cl para que se sienta como un taller de impresión 3D:
oscura, técnica, con el verde del logo y una pieza en 3D que se imprime por capas. Es la
primera fase; catálogo, ficha, checkout y admin conservan su estructura.

**Éxito:** la home se ve distinta a una plantilla, carga rápido (el contenido no espera al 3D),
funciona igual de bien en celular y respeta «reducir movimiento». Nada del flujo de compra cambia
de comportamiento.

## Alcance

**Dentro**

- Página de inicio completa (`app/page.tsx` y `components/home/*`).
- Paleta y tipografía nuevas en `app/globals.css` y `tailwind.config.ts`, aplicadas a **todo el
  sitio**: oscuro por defecto (`defaultTheme="dark"` en `ThemeProvider`), verde del logo como
  acento. El modo claro se conserva (botón actual) con su versión de la paleta.
- `Header` y `Footer` con el estilo nuevo (misma navegación y mismos enlaces).
- `ProductCard` con el estilo nuevo, porque se usa en la home y en el catálogo.

**Fuera**

- Estructura de catálogo, ficha de producto, carrito, checkout, cotización, cuenta y admin. Sólo
  heredan los colores nuevos.
- Testimonios, cifras de clientes o sellos de confianza: no hay datos reales y no se inventan.
- Cambios en datos, Supabase, pagos o correo.

## Dirección visual

- **Fondo** casi negro verdoso (`#0b0d0c`), superficies un paso más claras, bordes finos.
- **Acento** verde del logo (`#4ade80` en oscuro). En modo claro el acento de texto sigue siendo
  `#15803d` (AA sobre blanco). Todo par texto/fondo cumple WCAG AA.
- **Tipografía:** Geist (ya está) para títulos, en tamaños grandes y apretados; Geist Mono
  (`next/font/local`) para datos técnicos: capa, material, precio.
- **Motivo recurrente:** las capas. Las apariciones se hacen «de abajo hacia arriba en saltos»,
  como una impresión, no con fundidos genéricos.
- Se elimina el estilo `glass-card` con sombra verde en la home; las tarjetas pasan a superficie
  plana con borde fino y brillo sutil al pasar el mouse.

## Secciones de la home

1. **Hero.** Título grande en dos líneas («Piezas que nacen / capa por capa.»), línea técnica
   en mono, botones «Ver catálogo» (primario) y «Cotizar» (secundario). A la derecha (debajo en
   móvil), la pieza 3D.
2. **Cinta.** Texto técnico que se desliza horizontalmente en bucle: materiales, altura de capa,
   «hecho en Chile». Queda quieta con «reducir movimiento».
3. **Destacados.** Grilla bento con los productos `featured` (fotos reales). El primero ocupa una
   celda grande. La foto se revela de abajo hacia arriba en saltos al entrar en pantalla. Enlace
   «Ver todo». Si no hay destacados, la sección no se muestra (comportamiento actual).
4. **Cómo se hace.** Cuatro pasos: diseño → laminado → impresión → terminación. Cada paso se
   ilumina a medida que se hace scroll. Texto breve y real, sin promesas de plazos.
5. **Categorías.** Las cinco categorías actuales como accesos grandes con enlace a
   `/catalogo?category=…`.
6. **Cotización.** Cierre con borde verde: «¿Tienes una idea? Te la imprimimos.» → `/cotizacion`.

## La pieza 3D

- **Three.js puro** (`three`), sin `@react-three/fiber`: una sola escena no justifica otra capa.
- Componente cliente `components/home/hero-3d/HeroPiece.tsx`, cargado con
  `next/dynamic(..., { ssr: false })` **después** del contenido. Mientras carga, o si falla, se ve
  una imagen estática de la pieza en el mismo lugar (sin salto de layout).
- **Modelo:** reconstruido en código con `img2threejs` a partir de una foto del catálogo.
  Candidata: Calavera Arcoíris. Si la reconstrucción no queda convincente, se usa el Frasco
  Texturizado (geometría de revolución, mucho más fácil de lograr fiel). La geometría vive en un
  módulo propio (`model.ts`) separado de la escena (`scene.ts`).
- **Animación:** al cargar, un plano de corte sube en 30–40 saltos y la pieza «se imprime»; un
  anillo brillante marca la capa actual. Después gira lento y se inclina hacia el mouse.
- **Se apaga** (queda la imagen estática) con `prefers-reduced-motion`, sin WebGL, o en celulares
  de baja potencia (`navigator.hardwareConcurrency <= 4` en pantallas táctiles). La animación se
  pausa cuando el hero sale de pantalla o la pestaña está oculta.
- Presupuesto: el chunk del 3D no supera ~180 KB gzip y no bloquea el LCP (el LCP es el título).

## Animaciones (fuera del 3D)

- `framer-motion` (ya instalado). Un componente `LayerReveal` reemplaza a `ScrollReveal` en la
  home: revela con `clip-path` de abajo hacia arriba en saltos (`steps`).
- Con «reducir movimiento», todo aparece directamente, sin transición.
- Sólo se animan `transform`, `opacity` y `clip-path`.

## Habilidades que se usan

- `impeccable` y `design-taste-frontend`: dirección, jerarquía, evitar patrones genéricos.
- `redesign-existing-projects`: auditar lo actual sin romper funcionalidad.
- `high-end-visual-design`: espaciado, tipografía, detalles de hover.
- `img2threejs`: modelo procedural de la pieza.
- Estilos `futuristic` / `power` de awesome-design-skills como referencia de paleta oscura.
- `/browse` (o `playwright-cli`) para revisar la home en escritorio y móvil.

## Verificación

- `npm run build` sin errores (lint + tipos), como exige `CLAUDE.md`.
- `npm test` sigue en verde; tests nuevos para la lógica pura que se agregue (p. ej. la decisión
  de mostrar 3D o imagen estática).
- Revisión en navegador: escritorio y 375 px, modo oscuro y claro, «reducir movimiento» activado.
- Lighthouse en móvil: rendimiento y accesibilidad no peores que la home actual.
- El carrito desde la home (agregar producto sin variantes) sigue funcionando.

## Publicación

Todo en la rama `rediseno-home`. Pablo la publica con GitHub Desktop («Publish branch»), Vercel
genera una URL de vista previa, y sólo se fusiona a `master` cuando la aprueba.
