export type Role = 'admin' | 'responsible' | 'businessman' | 'student';

export function getRoleLabel(role: Role | string | null): string {
  switch (role) {
    case 'admin': return 'Administrador';
    case 'responsible': return 'Responsável';
    case 'businessman': return 'Empresário';
    case 'student': return 'Aluno';
    default: return 'Desconhecido';
  }
}

export function isAdmin(role: string | null): boolean {
  return role === 'admin';
}

export function isResponsible(role: string | null): boolean {
  return role === 'responsible' || role === 'businessman';
}

export function isStudent(role: string | null): boolean {
  return role === 'student';
}
