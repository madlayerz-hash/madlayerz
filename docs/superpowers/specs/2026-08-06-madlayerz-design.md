# MadLayerz — E-commerce de productos impresos en 3D

**Fecha:** 2026-08-06
**Estado:** Aprobado — Fase 1

## Contexto

MadLayerz vende productos impresos en 3D: llaveros, figuras de personajes, figuras decorativas, maceteros y juguetes ("un poco de todo"). El sitio anterior (hecho con IA de Google, desplegado en Vercel) fue descontinuado y el dominio `madlayerz.cl` (registrado en NIC Chile, nameservers apuntando a Vercel) quedó libre de cualquier proyecto. Este documento define el diseño del sitio construido desde cero.

## Alcance y fases

El proyecto completo (e-commerce + pagos reales + panel admin) es demasiado grande para una sola iteración. Se divide en:

- **Fase 1 (este spec):** Sitio completo funcional — catálogo, carrito, checkout con pago simulado, formulario de cotización, modo claro/oscuro, animaciones. Visualmente y funcionalmente completo salvo el cobro real.
- **Fase 2 (spec futuro):** Integración real de pago con Flow y Mercado Pago.
- **Fase 3 (spec futuro):** Panel de administración para gestionar productos, precios y stock sin tocar código.

## Decisiones de diseño

### Stack técnico
- **Framework:** Next.js (App Router) + TypeScript
- **Estilos:** Tailwind CSS
- **Animaciones:** Framer Motion
- **Base de datos:** Supabase (Postgres) — se adopta desde Fase 1 aunque el catálogo sea pequeño (<20 productos), para que el panel de administración de Fase 3 no requiera migrar datos después
- **Hosting:** Vercel (mismo proveedor que ya usa el dominio)
- **Modo claro/oscuro:** `next-themes`, toggle con ícono sol/luna en la navegación

### Identidad visual
- Paleta: blanco + verde en modo claro, negro + verde en modo oscuro
- Estilo: **playful + glassmorphism** — formas redondeadas, sombras suaves, tarjetas de vidrio esmerilado (`backdrop-filter: blur`) sobre manchas de color difuminadas de fondo
- Tipografía: sans-serif del sistema, pesos altos para títulos

### Estructura del sitio (Home — layout "Producto primero")
1. Header: logo, navegación (Catálogo, Cotización), buscador, toggle modo oscuro/claro, ícono carrito
2. Hero corto con animación (impresora 3D "dibujando" el logo) + buscador rápido
3. Grid de productos destacados (protagonista, arriba de todo)
4. Categorías en chips de scroll horizontal: Llaveros, Figuras de Personajes, Figuras Decorativas, Maceteros, Juguetes
5. Banner de cotización personalizada (CTA hacia el formulario de cotización)
6. Footer: redes sociales, WhatsApp directo, datos de contacto (placeholders reemplazables)

### Catálogo
- Grid de productos con filtro por categoría, rango de precio y buscador de texto
- Cada tarjeta: foto, nombre, precio, categoría, botón "Agregar al carrito" rápido

### Página de producto individual (layout "Simple con relacionados")
1. Foto + info (nombre, precio, opciones de color/tamaño si aplica, botón "Agregar al carrito") arriba
2. Descripción del producto debajo
3. Sección "También te puede gustar" con productos relacionados de la misma categoría

### Carrito
- Drawer lateral (no recarga de página), estilo vidrio esmerilado
- Lista de ítems con cantidad editable, subtotal, botón "Ir a pagar"

### Checkout (3 pasos)
1. **Datos de contacto y envío:** nombre, email, teléfono, dirección (si aplica)
2. **Método de entrega:**
   - Despacho a domicilio (Chilexpress/Correos/Starken) — costo estimado simplificado por región en Fase 1 (tabla fija, no integración de API de courier)
   - Retiro en punto físico (dirección fija que el usuario define)
3. **Método de pago:** selector visual Flow / Mercado Pago — en Fase 1 es **simulado**: al confirmar, el pedido se guarda en Supabase con estado `pendiente_pago` y se muestra una pantalla de confirmación. La integración real de cobro llega en Fase 2.
- No requiere cuenta de usuario/login — checkout como invitado

### Formulario de cotización personalizada
Página/sección dedicada, separada del checkout normal, con campos:
- Nombre, email, teléfono
- Descripción del proyecto/pieza deseada
- Adjuntar imagen de referencia (opcional)
- Cantidad estimada
- Presupuesto estimado (opcional)
- Al enviar: se guarda en Supabase y se notifica por email al dueño del sitio

### Animaciones (Framer Motion)
- Reveal de secciones al hacer scroll (fade + slide-up)
- Hover con elevación y brillo verde sutil en tarjetas de producto
- Micro-animación al agregar al carrito (ícono del carrito "salta"/pulsa)
- Transición suave de colores al cambiar modo claro/oscuro
- Hero: animación de una impresora 3D dibujando el logo "MadLayerz"

### Datos y contenido pendientes del cliente
- Fotos reales de cada producto
- Precios reales
- Texto "quiénes somos" (se deja placeholder editable si no está listo)
- Datos de contacto reales (WhatsApp, email, redes sociales)
- Tabla de costos de envío por región

## Fuera de alcance (Fase 1)
- Cobro real vía Flow/Mercado Pago (Fase 2)
- Panel de administración de productos (Fase 3)
- Cuentas de usuario / historial de pedidos para clientes
- Cálculo de envío en tiempo real vía API de courier

## Riesgos / consideraciones
- Sin panel admin en Fase 1, cualquier cambio de catálogo requiere editar código — aceptado explícitamente porque el catálogo de lanzamiento es pequeño (<20 productos)
- El checkout simulado debe dejar claro al usuario que el pago aún no se procesa de verdad, para evitar confusión, hasta que Fase 2 esté lista
