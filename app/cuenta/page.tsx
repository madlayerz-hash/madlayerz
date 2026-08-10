import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { fetchOrdersForUser, fetchAddresses } from '@/lib/supabase/queries';
import { OrderHistoryList } from '@/components/account/OrderHistoryList';
import { AddressList } from '@/components/account/AddressList';
import { AddressForm } from '@/components/account/AddressForm';

export default async function CuentaPage() {
  const client = await createServerSupabaseClient();
  const { data: userData } = await client.auth.getUser();

  if (!userData.user) redirect('/cuenta/login');

  let orders: Awaited<ReturnType<typeof fetchOrdersForUser>> = [];
  let addresses: Awaited<ReturnType<typeof fetchAddresses>> = [];

  try {
    [orders, addresses] = await Promise.all([
      fetchOrdersForUser(client, userData.user.id, userData.user.email ?? ''),
      fetchAddresses(client, userData.user.id),
    ]);
  } catch {
    orders = [];
    addresses = [];
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Mi cuenta
      </h1>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold">Mis pedidos</h2>
        <OrderHistoryList orders={orders} />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Mis direcciones</h2>
        <AddressList addresses={addresses} onChange={() => {}} />
        <div className="mt-4">
          <AddressForm onSaved={() => {}} />
        </div>
      </section>
    </main>
  );
}
