'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginSchema } from '@/lib/validation/auth-schema';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-client';

export function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    const client = createBrowserSupabaseClient();
    const { error } = await client.auth.signInWithPassword(result.data);

    if (error) {
      setServerError(error.message);
      return;
    }

    router.push('/cuenta');
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-bold">Iniciar sesión</h2>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="password">Contraseña</label>
        <input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
      </div>
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <button type="submit" className="rounded-full bg-brand py-3 font-semibold text-white">
        Iniciar sesión
      </button>
    </form>
  );
}
