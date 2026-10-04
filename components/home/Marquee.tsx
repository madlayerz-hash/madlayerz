import { TECH_FACTS } from './copy';

function Row() {
  return (
    <>
      {TECH_FACTS.map((fact) => (
        <span key={fact} className="flex items-center gap-6 pr-6">
          {fact}
          <span className="text-accent-text">/</span>
        </span>
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
        </div>
        {/* Copia para que el bucle no tenga corte; los lectores de pantalla la saltan. */}
        <div className="flex" aria-hidden="true">
          <Row />
        </div>
      </div>
    </div>
  );
}
