import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { fetchQuoteRequests, type QuoteRequestRecord } from '@/lib/supabase/queries';
import { AdminQuoteTable } from '@/components/admin/AdminQuoteTable';

export const dynamic = 'force-dynamic';

export default async function AdminCotizacionesPage() {
  const client = await createServerSupabaseClient();

  let quotes: QuoteRequestRecord[] = [];
  try {
    quotes = await fetchQuoteRequests(client);
  } catch {
    quotes = [];
  }

  const pending = quotes.filter((q) => q.status === 'nueva').length;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Cotizaciones
      </h1>
      <p className="mb-6 opacity-75">
        {pending > 0 ? `${pending} sin revisar` : 'Todo revisado'} · {quotes.length} en total
      </p>
      <AdminQuoteTable quotes={quotes} />
    </div>
  );
}
