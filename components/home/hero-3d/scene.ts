import {
  DirectionalLight,
  HemisphereLight,
  type Material,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Plane,
  Scene,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { PIECE_BASE_YAW, PIECE_HEIGHT, PIECE_RADIUS, buildPiece } from './model-calavera';
import { clipHeightAt } from './print-progress';

export interface SceneHandle {
  dispose(): void;
}

const TIMING = { durationMs: 2600, layers: 36, height: PIECE_HEIGHT };
// Vaivén lento (un ciclo cada ~9 s) en vez de giro completo: la pieza sólo muestra
// los ángulos en que se parece a la foto. Arranca en la vista base.
const SWAY_AMPLITUDE = Math.PI / 6;
const SWAY_RATE = (Math.PI * 2) / 9000;

export function createPrintScene(
  canvas: HTMLCanvasElement,
  options: { onFirstFrame?: () => void } = {}
): SceneHandle {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.localClippingEnabled = true;

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, PIECE_HEIGHT * 0.75, 8);
  camera.lookAt(0, PIECE_HEIGHT * 0.45, 0);

  scene.add(new HemisphereLight(0xe8fff0, 0x0b0d0c, 1.1));
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  // Contraluz verde: separa la pieza del fondo oscuro sin necesidad de sombra.
  const rim = new DirectionalLight(0x4ade80, 1.6);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  // Recorta todo lo que está por encima de la capa actual.
  const clip = new Plane(new Vector3(0, -1, 0), 0);
  const piece = buildPiece([clip]);
  scene.add(piece);

  // Anillo que marca la capa que se está imprimiendo.
  const ring = new Mesh(
    new TorusGeometry(PIECE_RADIUS * 1.08, 0.012, 8, 96),
    new MeshBasicMaterial({ color: 0x4ade80 })
  );
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const tilt = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  function onPointerMove(event: PointerEvent) {
    target.x = (event.clientY / window.innerHeight - 0.5) * 0.25;
    target.y = (event.clientX / window.innerWidth - 0.5) * 0.5;
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  let frame = 0;
  let running = false;
  let elapsed = 0;
  let last = 0;
  let firstFrameSent = false;
  // Sólo se dibuja cuando se ve: fuera de pantalla o con la pestaña oculta no gasta batería.
  let onScreen = true;

  function tick(now: number) {
    if (!onScreen || document.hidden) {
      running = false;
      return;
    }
    const delta = last === 0 ? 0 : Math.min(now - last, 50);
    last = now;
    elapsed += delta;

    const y = clipHeightAt(elapsed, TIMING);
    clip.constant = y;
    ring.position.y = y;
    ring.visible = y < PIECE_HEIGHT;

    tilt.x += (target.x - tilt.x) * 0.06;
    tilt.y += (target.y - tilt.y) * 0.06;
    const sway = Math.sin(elapsed * SWAY_RATE) * SWAY_AMPLITUDE;
    piece.rotation.set(tilt.x, PIECE_BASE_YAW + sway + tilt.y, 0);

    renderer.render(scene, camera);
    if (!firstFrameSent) {
      firstFrameSent = true;
      options.onFirstFrame?.();
    }
    frame = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    last = 0;
    frame = requestAnimationFrame(tick);
  }

  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) start();
  });
  visibility.observe(canvas);
  function onVisibilityChange() {
    if (!document.hidden) start();
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  start();

  return {
    dispose() {
      cancelAnimationFrame(frame);
      running = false;
      resizeObserver.disconnect();
      visibility.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      scene.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          const materials: Material[] = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
    },
  };
}
