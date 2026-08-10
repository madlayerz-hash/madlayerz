export type Role = 'cliente' | 'admin';

export interface Profile {
  id: string;
  email: string;
  role: Role;
}
