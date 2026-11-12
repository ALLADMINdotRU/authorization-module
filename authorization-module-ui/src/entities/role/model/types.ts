import type { ListSort } from "../../../shared/api/types"

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

export type RoleSortField = keyof Role

export type ListRolesArgs = Partial<ListSort<RoleSortField>> & {
  page?: number
  limit?: number
}
