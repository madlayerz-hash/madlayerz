import { TECH_FACTS } from './copy';

/**
 * Cada mitad del bucle tiene que ser más ancha que la pantalla: si no, al correrse
 * -50% queda un hueco vacío a la derecha y el reinicio salta. Con 4 frases una fila
 * mide ~875 px, así que cada mitad repite la fila 3 veces (~2600 px, cubre 2560).
 */
const ROWS_PER_HALF = 3;

function Row() {
  return (
    <>
      {TECH_FACTS.map((fact) => (
        <span key={fact} className="flex shrink-0 items-center gap-6 pr-6">
          {fact}
          <span className="text-accent-text">/</span>
        </span>
      ))}
    </>
  );
}

function Repeats({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Row key={i} />
      ))}
    </>
  );
}

export function Marquee() {
  return (
    <div className="overflow-hidden border-y border-line py-4 font-mono text-sm uppercase tracking-[0.2em] text-muted">
      <div className="ml-marquee__track">
        <div className="flex">
          <Row />
          {/* Las repeticiones son relleno visual: los lectores de pantalla leen la fila una vez. */}
          <span className="flex" aria-hidden="true">
            <Repeats count={ROWS_PER_HALF - 1} />
          </span>
        </div>
        <div className="flex" aria-hidden="true">
          <Repeats count={ROWS_PER_HALF} />
        </div>
      </div>
    </div>
  );
}
