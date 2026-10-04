# Catálogo real + variantes de color

**Estado (21 sep 2026): EN PRODUCCIÓN.** Deploy `0395d9c`. Verificado en vivo: fotos reales
cargan, el selector de color cambia la foto, ficha técnica visible, filtro por categoría desde la
BD, `?category=` funciona, la home ya no queda cacheada con productos borrados.

Se cargaron las 21 fotos de enero 2026 y se implementó el soporte de variantes de color.

## Lo que se implementó

**Variantes de color** — tabla `product_variants` (nombre, hex, foto propia, orden). El cliente
elige en la ficha, la foto cambia sola, y el color viaja hasta el pedido:
`order_items.variant_name`, la RPC `create_order` reemplazada, y el correo dice «Busto Rostro
Envuelto (Verde)». El carrito trata cada color como una línea distinta. `priceOrder` rechaza un
color que el producto no ofrece.

**Ficha técnica** — `material`, `dimensions_mm`, `weight_g`, `production_days`, `care_notes`.

**Galería** — `products.images` (arreglo); tira de miniaturas cuando hay más de una foto.

**En el catálogo**, un producto con variantes muestra los puntos de color y el botón dice
«Elegir color» en vez de «Agregar al carrito».

## Catálogo cargado (10 productos)

| Producto | Categoría | Precio | Variantes |
|---|---|---|---|
| Llavero Calavera Fosforescente | Llaveros | $3.500 | — |
| Calavera Arcoíris | Figuras decorativas | $24.900 | — |
| Busto Rostro Envuelto | Figuras decorativas | $12.900 | Negro, Verde, Verde y negro |
| Figura Dama Clásica | Figuras decorativas | $8.900 | Rosado, Verde |
| Maceta con Flores | Maceteros | $11.900 | — |
| Gato de Mármol (slug `hipopotamo-marmol`) | Figuras decorativas | $3.900 | — |
| Caja de Regalo Decorativa | Hogar y Organización | $9.900 | — |
| Ocarina de 6 Agujeros | Juguetes | $9.900 | — |
| Frasco Texturizado con Tapa | Hogar y Organización | $8.900 | — |
| Figura Articulada | Juguetes | $14.900 | — |

Los precios son una propuesta anclada en la competencia chilena, no un cálculo de costos.

**Ojo con el gato:** el producto se publicó como «Hipopótamo Mármol» y en realidad es un gato.
`supabase/FIX-GATO-MARMOL.sql` corrige nombre y descripción; el slug y el archivo de la foto se
dejan como están porque cambiarlos rompe la URL y la ruta de la imagen.

## Fotos dejadas fuera a propósito

Macetero Bart Simpson, buda Shrek, buda Pepe y buda Hello Kitty — riesgo de propiedad intelectual.
Las fotos existen; cargarlas es decisión de Pablo. La «Figura Articulada» no se pudo identificar:
si es un personaje con licencia, hay que renombrarla o sacarla.

## Pendiente

- Interruptor activo/inactivo para ocultar del catálogo productos que no se pueden borrar porque
  tienen pedidos asociados (Sonic, Llavero Baby Yoda).
- El panel de admin **no** edita variantes ni ficha técnica; eso sólo entra por SQL.
