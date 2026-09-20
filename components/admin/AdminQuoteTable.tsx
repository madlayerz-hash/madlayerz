'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { QuoteRequestRecord } from '@/lib/supabase/queries';
import { formatClp } from '@/lib/site';

const STATUS_LABELS: Record<string, string> = {
  nueva: 'Nueva',
  en_proceso: 'En proceso',
  cotizada: 'Cotizada',
  aceptada: 'Aceptada',
  cerrada: 'Cerrada',
};

export function AdminQuoteTable({ quotes }: { quotes: QuoteRequestRecord[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleStatusChange(id: string, status: string) {
    setError('');
    const response = await fetch(`/api/admin/quotes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? 'No pudimos actualizar el estado.');
      return;
    }

    router.refresh();
  }

  if (quotes.length === 0) {
    return <p className="opacity-70">No hay solicitudes de cotización todavía.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-500">{error}</p>}

      {quotes.map((quote) => (
        <div key={quote.id}>
          <button
            onClick={() => setOpenId(openId === quote.id ? null : quote.id)}
            aria-expanded={openId === quote.id}
            className="glass-surface flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl p-4 text-left"
          >
            <span className="font-semibold">{quote.name}</span>
            <span className="text-sm opacity-70">
              {new Date(quote.createdAt).toLocaleDateString('es-CL')} · {quote.quantity} unid.
            </span>
            <span className="rounded-full bg-brand/15 px-3 py-1 text-sm">
              {STATUS_LABELS[quote.status] ?? quote.status}
            </span>
          </button>

          {openId === quote.id && (
            <div className="glass-card mt-2 flex flex-col gap-3 p-6">
              <p className="whitespace-pre-wrap">{quote.description}</p>

              <dl className="grid grid-cols-1 gap-1 text-sm opacity-85 sm:grid-cols-2">
                <div>
                  <dt className="inline font-semibold">Email: </dt>
                  <dd className="inline">
                    <a href={`mailto:${quote.email}`} className="underline">{quote.email}</a>
                  </dd>
                </div>
                <div>
                  <dt className="inline font-semibold">Teléfono: </dt>
                  <dd className="inline">
                    <a href={`tel:${quote.phone.replace(/\s/g, '')}`} className="underline">{quote.phone}</a>
                  </dd>
                </div>
                <div>
                  <dt className="inline font-semibold">Cantidad: </dt>
                  <dd className="inline">{quote.quantity}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold">Presupuesto: </dt>
                  <dd className="inline">{quote.budgetClp ? formatClp(quote.budgetClp) : 'No indicado'}</dd>
                </div>
              </dl>

              <div>
                <label htmlFor={`estado-${quote.id}`}>Estado</label>
                <select
                  id={`estado-${quote.id}`}
                  defaultValue={quote.status}
                  onChange={(e) => handleStatusChange(quote.id, e.target.value)}
                  className="w-full rounded-full bg-transparent px-3 py-2 sm:w-auto"
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <a
                href={`mailto:${quote.email}?subject=${encodeURIComponent('Tu cotización en MadLayerz')}`}
                className="self-start rounded-full bg-brand px-6 py-2 font-semibold text-white"
              >
                Responder por email
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
