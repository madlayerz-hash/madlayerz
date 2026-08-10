import { describe, it, expect } from 'vitest';
import { loginSchema, signupSchema } from './auth-schema';

describe('loginSchema', () => {
  it('accepts a valid email and password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'secret123' }).success).toBe(true);
  });

  it('rejects a short password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '123' }).success).toBe(false);
  });
});

describe('signupSchema', () => {
  it('accepts a valid signup', () => {
    expect(
      signupSchema.safeParse({ name: 'Pablo Toro', email: 'a@b.com', password: 'secret123' }).success
    ).toBe(true);
  });

  it('rejects a name that is too short', () => {
    expect(
      signupSchema.safeParse({ name: 'P', email: 'a@b.com', password: 'secret123' }).success
    ).toBe(false);
  });
});
