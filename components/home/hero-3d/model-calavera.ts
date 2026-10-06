import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Plane,
} from 'three';

export const PIECE_HEIGHT = 3;
// Radio horizontal máximo desde el eje de giro (nuca a dientes) ya normalizado.
// Se mide sobre la malla armada; si cambia la anatomía hay que volver a medirlo.
export const PIECE_RADIUS = 1.55;

// La calavera no gira entera: oscila ±30° alrededor de esta vista de tres cuartos.
// De frente y en tres cuartos se reconoce; de perfil y de espaldas el modelo
// procedural pierde el parecido con la pieza real (queda un huevo de colores).
export const PIECE_BASE_YAW = (35 * Math.PI) / 180;

// El cráneo se modela en centímetros de un cráneo adulto real (alto ~22 cm): así
// cada medida se puede contrastar con una tabla de anatomía en vez de ser un número mágico.
// Marco: y arriba, z hacia la cara, x a la izquierda del cráneo; mentón en y = 0.
const BOUNDS = { min: [-8, -2, -17], max: [8, 23, 10] } as const;
const CELL = 0.27;
// La malla se evalúa primero en bloques gruesos y sólo se afina cerca de la superficie:
// el volumen completo a resolución fina tarda segundos en un teléfono.
const BLOCK = 4;

function ellipsoid(x: number, y: number, z: number, rx: number, ry: number, rz: number): number {
  const ux = x / rx, uy = y / ry, uz = z / rz;
  const vx = ux / rx, vy = uy / ry, vz = uz / rz;
  const k0 = Math.sqrt(ux * ux + uy * uy + uz * uz);
  const k1 = Math.sqrt(vx * vx + vy * vy + vz * vz);
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}

function capsule(
  x: number, y: number, z: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  r: number
): number {
  const px = x - ax, py = y - ay, pz = z - az;
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const h = Math.max(0, Math.min(1, (px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz)));
  const qx = px - dx * h, qy = py - dy * h, qz = pz - dz * h;
  return Math.sqrt(qx * qx + qy * qy + qz * qz) - r;
}

// Uniones y cortes suaves: un hueso no tiene aristas vivas, y un min/max duro
// deja pliegues que delatan las primitivas.
function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

function add(d: number, e: number, k: number): number {
  return e >= d + k ? d : smin(d, e, k);
}

function cut(d: number, e: number, k: number): number {
  return e >= -d + k ? d : -smin(-d, e, k);
}

// Las arcadas dentales y el cuerpo de la mandíbula siguen un arco con centro detrás
// de los dientes. Se trabaja en coordenadas polares sobre ese arco.
const ARCH_Z = 4.0;
const ARCH_MAX = 1.3;

/** Barra que sigue el arco dental (radio R, alto y0) con sección elíptica (rr, ry). */
function archBar(x: number, y: number, z: number, R: number, y0: number, rr: number, ry: number): number {
  const angle = Math.max(-ARCH_MAX, Math.min(ARCH_MAX, Math.atan2(x, z - ARCH_Z)));
  const px = R * Math.sin(angle), pz = ARCH_Z + R * Math.cos(angle);
  const dh = Math.sqrt((x - px) * (x - px) + (z - pz) * (z - pz));
  const u = dh / rr, v = (y - y0) / ry;
  return (Math.sqrt(u * u + v * v) - 1) * Math.min(rr, ry);
}

/**
 * Una fila de dientes: cada pieza es un elipsoide repetido a lo largo del arco.
 * Es lo que más delata a una calavera de lejos, más que la forma del cráneo.
 */
function teeth(x: number, y: number, z: number, R: number, y0: number, ry: number): number {
  const angle = Math.atan2(x, z - ARCH_Z);
  if (Math.abs(angle) > ARCH_MAX) return 9;
  // Incisivos angostos al centro, muelas más anchas atrás.
  const step = Math.abs(angle) < 0.4 ? 0.17 : 0.21;
  const base = Math.abs(angle) < 0.4 ? 0 : 0.4;
  const a = Math.abs(angle) - base;
  const slot = (Math.floor(a / step) + 0.5) * step + base;
  const r = Math.sqrt(x * x + (z - ARCH_Z) * (z - ARCH_Z));
  const tangential = r * Math.sin(Math.abs(angle) - slot);
  const radial = r * Math.cos(Math.abs(angle) - slot) - R;
  return ellipsoid(tangential, y - y0, radial, (step * R) * 0.5, ry, 0.5);
}

function anatomy(x: number, y: number, z: number): number {
  const ax = Math.abs(x);

  // Bóveda: el neurocráneo domina la silueta (19 cm de largo, 14 de ancho).
  let d = ellipsoid(x, y - 13.8, z + 0.5, 6.5, 7.0, 8.4);
  // Base del cráneo y occipital, que bajan por detrás de la mandíbula.
  d = add(d, ellipsoid(x, y - 7.6, z + 3.8, 5.3, 5.3, 5.0), 3.6);
  // Apófisis mastoides: dan el "escalón" detrás de la rama mandibular.
  if (ax > 3 && y < 11 && z < 1 && z > -4) {
    d = add(d, ellipsoid(ax - 4.9, y - 8.6, z + 1.9, 1.0, 1.4, 1.0), 0.8);
  }

  // Macizo facial: maxilar, pómulos y arco superciliar.
  if (z > -1 && y < 14.5) {
    d = add(d, ellipsoid(x, y - 7.6, z - 5.6, 4.4, 3.6, 3.4), 1.4);
    d = add(d, ellipsoid(ax - 4.4, y - 9.4, z - 6.0, 1.1, 1.3, 1.1), 1.6);
    d = add(d, capsule(ax, y, z, 1.2, 12.3, 7.6, 4.4, 12.0, 5.8, 0.7), 0.8);
  }

  // Fosa temporal: el cráneo se angosta detrás de la órbita, sobre el arco cigomático.
  d = cut(d, ellipsoid(ax - 7.6, y - 10.6, z - 2.2, 1.6, 2.8, 3.6), 1.4);
  // Arco cigomático: después de la fosa, para que quede como un puente exento.
  if (ax > 3.5 && y > 7 && y < 11.5 && z > -4 && z < 7) {
    d = add(d, capsule(ax, y, z, 5.2, 9.2, 5.0, 6.3, 9.0, -2.2, 0.48), 0.8);
  }

  // Huesos nasales: un lomo angosto que sale entre las órbitas.
  if (ax < 2 && y > 8.5 && y < 13 && z > 6) {
    d = add(d, capsule(x, y, z, 0, 12.0, 7.7, 0, 9.9, 8.5, 0.5), 0.6);
  }

  // Órbitas: pozos hondos y redondeados, levemente inclinados hacia afuera y abajo.
  d = cut(d, ellipsoid(ax - 3.15, y - 10.7, z - 9.6, 1.95, 1.75, 4.6), 0.5);
  // Abertura nasal en forma de pera invertida, ancha abajo.
  d = cut(d, ellipsoid(x, y - 7.9, z - 9.4, 1.2, 1.7, 2.6), 0.35);
  d = cut(d, ellipsoid(x, y - 7.2, z - 9.0, 1.35, 0.9, 2.4), 0.35);

  // Dientes y mandíbula sólo existen abajo y adelante: el resto se salta.
  if (y < 7 && z > -3) {
    // Reborde alveolar superior: el hueso del que cuelgan los dientes de arriba.
    d = add(d, archBar(x, y, z, 4.2, 5.7, 0.9, 0.8), 0.8);
    d = add(d, archBar(x, y, z, 3.7, 3.9, 0.8, 1.3), 0.4);
    d = add(d, teeth(x, y, z, 4.55, 4.45, 0.62), 0.12);
    d = add(d, teeth(x, y, z, 4.4, 3.3, 0.58), 0.12);

    // Mandíbula en U: cuerpo, mentón y la rama que sube hasta la articulación.
    d = add(d, archBar(x, y, z, 4.0, 2.1, 1.0, 0.95), 0.6);
    d = add(d, ellipsoid(x, y - 1.3, z - 7.0, 2.3, 1.3, 1.1), 0.9);
    // Cuerpo mandibular hacia atrás: una placa alta, no una barra (se escala y).
    if (ax > 2.5) {
      d = add(d, capsule(ax, y * 0.45, z, 3.7, 0.95, 5.0, 4.8, 0.75, 0.2, 0.75), 0.7);
    }
  }
  if (ax > 3.5 && y < 10 && z < 2 && z > -4) {
    d = add(d, ellipsoid(ax - 4.9, y - 4.3, z - 0.5, 0.6, 4.2, 1.9), 0.6);
  }
  return d;
}

// La pieza descansa sobre la mandíbula y la nuca, así que queda mirando un poco
// hacia arriba: el cráneo se modela derecho y después se inclina.
const PITCH = 0.22;
const COS_P = Math.cos(PITCH);
const SIN_P = Math.sin(PITCH);
// Altura (ya inclinada) donde se corta la base plana de apoyo.
const GROUND = 0.8;

function localY(y: number, z: number): number {
  return y * COS_P - z * SIN_P;
}

function localZ(y: number, z: number): number {
  return y * SIN_P + z * COS_P;
}

function skull(x: number, y: number, z: number): number {
  const d = anatomy(x, localY(y, z), localZ(y, z));
  // Base plana: la pieza se imprime apoyada sobre la mesa.
  return Math.max(d, GROUND - y);
}

// Paradas en sRGB tomadas de las fotos; se pasan a lineal porque three espera
// colores de vértice lineales y si no el rojo se lava a rosado.
const STOPS: Array<[number, number, number, number]> = [
  [0.0, 0.12, 0.46, 0.24],
  [0.14, 0.2, 0.52, 0.22],
  [0.26, 0.55, 0.62, 0.16],
  [0.38, 0.84, 0.68, 0.18],
  [0.56, 0.86, 0.55, 0.15],
  [0.68, 0.8, 0.3, 0.17],
  [0.78, 0.72, 0.18, 0.2],
  [1.0, 0.62, 0.12, 0.2],
].map(([t, r, g, b]) => [t, r ** 2.2, g ** 2.2, b ** 2.2] as [number, number, number, number]);

/**
 * Degradado del filamento arcoíris: las bandas van inclinadas, rojo en la cara y
 * la coronilla, dorado en la sien y verde abajo en la nuca, como en las fotos.
 * Recibe coordenadas ya normalizadas (alto 0..3, largo aprox. -1.5..1.5).
 */
function filamentColor(y: number, z: number, out: Float32Array, offset: number) {
  const depth = (z + 1.5) / 3;
  const t = Math.max(0, Math.min(1, (depth * 0.85 + (y / PIECE_HEIGHT) * 0.45) / 1.08));
  let i = 0;
  while (i < STOPS.length - 2 && t > STOPS[i + 1][0]) i += 1;
  const [t0, r0, g0, b0] = STOPS[i];
  const [t1, r1, g1, b1] = STOPS[i + 1];
  const f = (t - t0) / (t1 - t0);
  out[offset] = r0 + (r1 - r0) * f;
  out[offset + 1] = g0 + (g1 - g0) * f;
  out[offset + 2] = b0 + (b1 - b0) * f;
}

interface Field {
  nx: number;
  ny: number;
  nz: number;
  values: Float32Array;
  /** Bloques que tocan la superficie; sólo ahí puede haber cambio de signo. */
  activeBlocks: number[];
}

function sampleField(): Field {
  const [x0, y0, z0] = BOUNDS.min;
  const nx = Math.ceil((BOUNDS.max[0] - x0) / CELL) + 1;
  const ny = Math.ceil((BOUNDS.max[1] - y0) / CELL) + 1;
  const nz = Math.ceil((BOUNDS.max[2] - z0) / CELL) + 1;
  const values = new Float32Array(nx * ny * nz);
  const activeBlocks: number[] = [];
  // Un bloque cuyo centro está más lejos de la superficie que su semidiagonal no
  // la toca: basta con copiar ese valor, que sólo aporta el signo.
  const reach = BLOCK * CELL * 1.2;
  const exact = new Uint8Array(nx * ny * nz);
  for (let bk = 0; bk < nz - 1; bk += BLOCK) {
    for (let bj = 0; bj < ny - 1; bj += BLOCK) {
      for (let bi = 0; bi < nx - 1; bi += BLOCK) {
        const ek = Math.min(bk + BLOCK, nz - 1);
        const ej = Math.min(bj + BLOCK, ny - 1);
        const ei = Math.min(bi + BLOCK, nx - 1);
        const mid = skull(x0 + (bi + BLOCK / 2) * CELL, y0 + (bj + BLOCK / 2) * CELL, z0 + (bk + BLOCK / 2) * CELL);
        const far = Math.abs(mid) > reach;
        if (!far) activeBlocks.push(bi, bj, bk);
        for (let k = bk; k <= ek; k += 1) {
          for (let j = bj; j <= ej; j += 1) {
            let index = bi + nx * (j + ny * k);
            for (let i = bi; i <= ei; i += 1, index += 1) {
              // Un punto compartido ya calculado con precisión por un bloque activo no se pisa.
              if (exact[index]) continue;
              if (far) {
                values[index] = mid;
              } else {
                values[index] = skull(x0 + i * CELL, y0 + j * CELL, z0 + k * CELL);
                exact[index] = 1;
              }
            }
          }
        }
      }
    }
  }
  return { nx, ny, nz, values, activeBlocks };
}

/**
 * Surface nets sobre el campo de distancia: da una malla continua y orgánica
 * sin depender de un .glb, y pesa unos pocos KB de código.
 */
function polygonize(): BufferGeometry {
  const [x0, y0, z0] = BOUNDS.min;
  const { nx, ny, nz, values, activeBlocks } = sampleField();
  const sx = 1, sy = nx, sz = nx * ny;
  const cellVertex = new Int32Array(nx * ny * nz).fill(-1);
  const positions: number[] = [];
  // Desplazamientos de las 8 esquinas de una celda y las 12 aristas que las unen.
  const cornerOffset = [0, sx, sy, sx + sy, sz, sx + sz, sy + sz, sx + sy + sz];
  const edgeA = [0, 2, 4, 6, 0, 1, 4, 5, 0, 1, 2, 3];
  const edgeB = [1, 3, 5, 7, 2, 3, 6, 7, 4, 5, 6, 7];
  const corner = new Float32Array(8);

  for (let b = 0; b < activeBlocks.length; b += 3) {
    const bi = activeBlocks[b], bj = activeBlocks[b + 1], bk = activeBlocks[b + 2];
    for (let k = bk; k < Math.min(bk + BLOCK, nz - 1); k += 1) {
      for (let j = bj; j < Math.min(bj + BLOCK, ny - 1); j += 1) {
        for (let i = bi; i < Math.min(bi + BLOCK, nx - 1); i += 1) {
          const base = i + sy * j + sz * k;
          let inside = 0;
          for (let c = 0; c < 8; c += 1) {
            corner[c] = values[base + cornerOffset[c]];
            if (corner[c] < 0) inside += 1;
          }
          if (inside === 0 || inside === 8) continue;

          let px = 0, py = 0, pz = 0, n = 0;
          for (let e = 0; e < 12; e += 1) {
            const a = edgeA[e], c = edgeB[e];
            const va = corner[a], vb = corner[c];
            if ((va < 0) === (vb < 0)) continue;
            const t = va / (va - vb);
            px += (a & 1) + ((c & 1) - (a & 1)) * t;
            py += ((a >> 1) & 1) + (((c >> 1) & 1) - ((a >> 1) & 1)) * t;
            pz += (a >> 2) + ((c >> 2) - (a >> 2)) * t;
            n += 1;
          }
          cellVertex[base] = positions.length / 3;
          positions.push(x0 + (i + px / n) * CELL, y0 + (j + py / n) * CELL, z0 + (k + pz / n) * CELL);
        }
      }
    }
  }

  const indices: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) indices.push(a, d, c, a, c, b);
    else indices.push(a, b, c, a, c, d);
  };
  for (let b = 0; b < activeBlocks.length; b += 3) {
    const bi = activeBlocks[b], bj = activeBlocks[b + 1], bk = activeBlocks[b + 2];
    for (let k = Math.max(bk, 1); k < Math.min(bk + BLOCK, nz - 1); k += 1) {
      for (let j = Math.max(bj, 1); j < Math.min(bj + BLOCK, ny - 1); j += 1) {
        for (let i = Math.max(bi, 1); i < Math.min(bi + BLOCK, nx - 1); i += 1) {
          const p = i + sy * j + sz * k;
          const inside = values[p] < 0;
          if (inside !== values[p + sx] < 0) {
            quad(cellVertex[p - sy - sz], cellVertex[p - sz], cellVertex[p], cellVertex[p - sy], !inside);
          }
          if (inside !== values[p + sy] < 0) {
            quad(cellVertex[p - sx - sz], cellVertex[p - sx], cellVertex[p], cellVertex[p - sz], !inside);
          }
          if (inside !== values[p + sz] < 0) {
            quad(cellVertex[p - sx - sy], cellVertex[p - sy], cellVertex[p], cellVertex[p - sx], !inside);
          }
        }
      }
    }
  }

  // Normaliza: base en y = 0, alto PIECE_HEIGHT y centrado en el eje de giro (el
  // cráneo es más largo que alto y si no "orbitaría" al rotar).
  const count = positions.length / 3;
  let maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let v = 0; v < count; v += 1) {
    maxY = Math.max(maxY, positions[v * 3 + 1]);
    minZ = Math.min(minZ, positions[v * 3 + 2]);
    maxZ = Math.max(maxZ, positions[v * 3 + 2]);
  }
  const scale = PIECE_HEIGHT / (maxY - GROUND);
  const midZ = (minZ + maxZ) / 2;
  const position = new Float32Array(count * 3);
  for (let v = 0; v < count; v += 1) {
    position[v * 3] = positions[v * 3] * scale;
    position[v * 3 + 1] = Math.max(0, (positions[v * 3 + 1] - GROUND) * scale);
    position[v * 3 + 2] = (positions[v * 3 + 2] - midZ) * scale;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setIndex(indices);
  // Normales desde la malla: el campo ya es suave y evaluarlo de nuevo por vértice
  // duplicaba el tiempo de armado.
  geometry.computeVertexNormals();
  const normal = geometry.getAttribute('normal');

  const color = new Float32Array(count * 3);
  for (let v = 0; v < count; v += 1) {
    const x = positions[v * 3], y = positions[v * 3 + 1], z = positions[v * 3 + 2];
    const gx = normal.getX(v), gy = normal.getY(v), gz = normal.getZ(v);

    // Oclusión aproximada desde el propio campo: oscurece fosas, órbitas y el
    // espacio entre dientes como la sombra real (la escena no proyecta sombras).
    let occlusion = 0;
    for (let s = 1; s <= 2; s += 1) {
      const step = s * 0.9;
      occlusion += Math.max(0, step - skull(x + gx * step, y + gy * step, z + gz * step)) / (step * s);
    }
    const ly = localY(y, z), lz = localZ(y, z);
    // El fondo de las órbitas y de la nariz se ve casi negro en la foto.
    const socket = Math.min(
      ellipsoid(Math.abs(x) - 3.15, ly - 10.7, lz - 9.6, 1.95, 1.75, 4.6),
      ellipsoid(x, ly - 7.9, lz - 9.4, 1.2, 1.7, 2.6)
    );
    const depthInSocket = socket < 0.3 ? Math.max(0, Math.min(1, (8.6 - lz) / 2.4)) : 0;
    // Líneas de capa: una franja tenue cada pocos milímetros de alto, como el FDM.
    const layer = 0.93 + 0.07 * Math.sin(position[v * 3 + 1] * 60);
    const light = Math.max(0.12, 1 - occlusion * 0.55) * (1 - 0.8 * depthInSocket) * layer;
    filamentColor(position[v * 3 + 1], position[v * 3 + 2], color, v * 3);
    color[v * 3] *= light;
    color[v * 3 + 1] *= light;
    color[v * 3 + 2] *= light;
  }
  geometry.setAttribute('color', new BufferAttribute(color, 3));
  return geometry;
}

export function buildPiece(clippingPlanes: Plane[]): Group {
  const material = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.42,
    metalness: 0.18,
    clippingPlanes,
    clipShadows: true,
    side: DoubleSide,
  });

  const group = new Group();
  group.add(new Mesh(polygonize(), material));
  return group;
}
