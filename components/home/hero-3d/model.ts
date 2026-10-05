import {
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  type Plane,
  Vector2,
} from 'three';

export const PIECE_HEIGHT = 3;
export const PIECE_RADIUS = 1.05;

const BODY_TOP = 2.35;

/**
 * Frasco con las líneas de capa a la vista: el relieve horizontal es
 * exactamente lo que deja una impresora FDM, así que el modelo cuenta el
 * oficio sin texto.
 */
function bodyProfile(): Vector2[] {
  const points: Vector2[] = [new Vector2(0, 0), new Vector2(0.9, 0)];
  const segments = 140;
  for (let i = 0; i <= segments; i += 1) {
    const y = (i / segments) * BODY_TOP;
    const shoulder = y > 1.95 ? (y - 1.95) * 0.55 : 0;
    const ridge = 0.022 * Math.sin(y * 55);
    points.push(new Vector2(1 - shoulder + ridge, y));
  }
  points.push(new Vector2(0.72, BODY_TOP));
  return points;
}

export function buildPiece(clippingPlanes: Plane[]): Group {
  const material = new MeshStandardMaterial({
    color: 0x3fcf74,
    roughness: 0.55,
    metalness: 0.05,
    clippingPlanes,
    clipShadows: true,
    side: DoubleSide,
  });

  const group = new Group();

  group.add(new Mesh(new LatheGeometry(bodyProfile(), 96), material));

  const lidHeight = PIECE_HEIGHT - BODY_TOP - 0.05;
  const lid = new Mesh(new CylinderGeometry(0.8, 0.8, lidHeight, 72, 1), material);
  lid.position.y = BODY_TOP + 0.05 + lidHeight / 2;
  group.add(lid);

  return group;
}
