'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signupSchema } from '@/lib/validation/auth-schema';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-client';

export function SignupForm() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const result = signupSchema.safeParse(form);
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
    const { error } = await client.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: { data: { name: result.data.name } },
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="glass-card p-6 text-center">
        ¡Listo! Revisa tu email para confirmar tu cuenta antes de iniciar sesión.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-bold">Crear cuenta</h2>
      <div>
        <label htmlFor="name">Nombre</label>
        <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>
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
        Crear cuenta
      </button>
    </form>
  );
}
