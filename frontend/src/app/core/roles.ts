import { Role } from './api.types';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  lider: 'Líder',
  especialista: 'Especialista',
  gestor: 'Gestor',
  colaborador: 'Colaborador'
};

export const ALL_ROLES: Role[] = ['admin', 'lider', 'especialista', 'gestor', 'colaborador'];
export const MANAGE_ITEM_ROLES: Role[] = ['admin', 'lider', 'especialista'];
export const REPORT_ROLES: Role[] = ['admin', 'lider', 'especialista', 'gestor'];
export const USER_ADMIN_ROLES: Role[] = ['admin'];

export function hasRole(userRole: Role | undefined, allowed: Role[]): boolean {
  return !!userRole && allowed.includes(userRole);
}
