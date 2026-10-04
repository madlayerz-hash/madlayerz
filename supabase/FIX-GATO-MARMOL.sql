-- Corrección de nombre: el producto publicado como «Hipopótamo Mármol» es un gato.
-- Pegar en Supabase → SQL Editor y ejecutar. Es idempotente: se puede correr dos veces.
--
-- El slug (`hipopotamo-marmol`) y el nombre del archivo de la foto NO se tocan:
-- cambiarlos rompería la URL del producto y la ruta de la imagen, y ninguno de
-- los dos es visible para el cliente.

update products
set name = 'Gato de Mármol',
    description = 'Gato enroscado en miniatura, impreso en filamento con efecto mármol: el moteado gris viene en el material, no está pintado, así que no se despinta nunca. Del porte de una moneda de cien.'
where slug = 'hipopotamo-marmol';

-- Verificación
select slug, name, price_clp from products where slug = 'hipopotamo-marmol';
