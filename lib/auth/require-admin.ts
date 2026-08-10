import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import type { Profile } from './types';

export async function requireAdmin(): Promise<Profile> {
  const client = await createServerSupabaseClient();
  const { data: userData } = await client.auth.getUser();

  if (!userData.user) {
    notFound();
  }

  const { data: profile } = await client
    .from('profiles')
    .select('id, email, role')
    .eq('id', userData.user!.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    notFound();
  }

  return profile as Profile;
}
