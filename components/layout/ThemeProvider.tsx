'use client';

import { MotionConfig } from 'framer-motion';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {/* El CSS de reduce-motion no frena los hover/whileHover de framer-motion;
          reducedMotion="user" los desactiva (transform) cuando el sistema lo pide. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </NextThemesProvider>
  );
}
