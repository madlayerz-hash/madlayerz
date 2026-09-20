import type { Metadata } from 'next';
import { SignupForm } from '@/components/auth/SignupForm';

export const metadata: Metadata = {
  title: 'Crear cuenta',
  robots: { index: false, follow: false },
};

export default function RegistroPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <SignupForm />
    </main>
  );
}
