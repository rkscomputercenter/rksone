import type { Role } from '../types';

const BASE: Record<Role, string> = {
  USER: 'Staff', MANAGER: 'Manager', ADMIN: 'Admin', SUPER_ADMIN: 'Super admin', CUSTOM: 'Custom role',
};

/** What to call someone's role on screen: a custom-role person gets the name of their role ("Bank clerk"). */
export function roleLabel(role: Role | string | null | undefined, customRoleName?: string | null): string {
  if (role === 'CUSTOM' && customRoleName) return customRoleName;
  return BASE[role as Role] ?? String(role ?? '');
}
