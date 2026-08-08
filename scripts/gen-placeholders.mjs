import { mkdirSync, writeFileSync } from 'fs';

const products = [
  { slug: 'llavero-baby-yoda', name: 'Llavero Baby Yoda', color: '#22c55e' },
  { slug: 'llavero-mario', name: 'Llavero Mario Bros', color: '#4ade80' },
  { slug: 'llavero-pokebola', name: 'Llavero Pokébola', color: '#16a34a' },
  { slug: 'figura-goku', name: 'Figura Goku SSJ', color: '#22c55e' },
  { slug: 'figura-mando', name: 'Figura El Mandaloriano', color: '#4ade80' },
  { slug: 'figura-link', name: 'Figura Link', color: '#16a34a' },
  { slug: 'figura-dragon', name: 'Figura Dragón', color: '#22c55e' },
  { slug: 'figura-buho', name: 'Figura Búho Geométrico', color: '#4ade80' },
  { slug: 'macetero-geometrico', name: 'Macetero Geométrico', color: '#16a34a' },
  { slug: 'macetero-gato', name: 'Macetero Gato', color: '#22c55e' },
  { slug: 'macetero-colgante', name: 'Macetero Colgante', color: '#4ade80' },
  { slug: 'juguete-trompo', name: 'Trompo Articulado', color: '#16a34a' },
  { slug: 'juguete-pulpo', name: 'Pulpo Articulado', color: '#22c55e' },
  { slug: 'juguete-dado', name: 'Dado Gigante', color: '#4ade80' },
];

mkdirSync('public/products', { recursive: true });

for (const p of products) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="${p.color}"/>
  <text x="300" y="280" font-family="sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">${p.name}</text>
  <text x="300" y="320" font-family="sans-serif" font-size="18" fill="white" text-anchor="middle" opacity="0.85">MadLayerz</text>
</svg>`;
  writeFileSync(`public/products/${p.slug}.svg`, svg);
}

console.log(`Generated ${products.length} placeholder images in public/products/`);
