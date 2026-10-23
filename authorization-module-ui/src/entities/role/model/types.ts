export type Role = {
  id: number
  name: string
  description: string | null
}

export type RoleCreate = {
  name: string
  description?: string | null
}

export type RoleUpdate = Partial<RoleCreate>

export type ListRolesArgs = {
  page?: number
  limit?: number
}
