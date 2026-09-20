import type { Metadata } from 'next';
import { QuoteForm } from '@/components/quote/QuoteForm';

export const metadata: Metadata = {
  title: 'Cotización personalizada',
  description:
    'Cuéntanos tu idea y te enviamos una cotización a medida para tu pieza impresa en 3D. Diseños propios, regalos corporativos y series pequeñas.',
  alternates: { canonical: '/cotizacion' },
};

export default function CotizacionPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-8">
      <h1 className="mb-2 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Cotización personalizada
      </h1>
      <p className="mb-6">Cuéntanos tu idea y te respondemos con una propuesta hecha a medida.</p>
      <QuoteForm />
    </main>
  );
}
