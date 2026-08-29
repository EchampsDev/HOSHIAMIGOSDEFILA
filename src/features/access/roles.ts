export const userRoleValues = ['ADMIN', 'USER', 'CONSTELLATION_CONTRIBUTOR', 'GUEST', 'SPECIAL'] as const

export type UserRole = typeof userRoleValues[number]

export const userRoleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  USER: 'Usuario normal',
  CONSTELLATION_CONTRIBUTOR: 'Contribuyente de proyecto',
  GUEST: 'Usuario invitado',
  SPECIAL: 'Usuario especial',
}

export const isConstellationContributor = (role: UserRole | null | undefined) => role === 'CONSTELLATION_CONTRIBUTOR'
