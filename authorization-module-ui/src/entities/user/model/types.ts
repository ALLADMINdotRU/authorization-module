import type { ListSort } from "../../../shared/api/types"

export type UserProfile = {
  id: number
  username: string
  email: string | null
  full_name: string | null
  mobile_phone: string | null
  ip_phone: string | null
  messenger: string | null
  company: string | null
  department: string | null
  position: string | null
  is_active: boolean
  auth_method: string
  created_at: string
  photo_updated_at?: string | null
}

export type User = UserProfile & {
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: number | null
}

export type UserCreate = {
  username: string
  password?: string | null
  email?: string | null
  full_name?: string | null
  mobile_phone?: string | null
  ip_phone?: string | null
  messenger?: string | null
  company?: string | null
  department?: string | null
  position?: string | null
  auth_method?: string
  is_active?: boolean
}

export type UserUpdate = Partial<UserCreate>

export type UserSortField = Exclude<
  keyof User,
  "deleted_by" | "photo_updated_at"
>

export type ListUsersArgs = Partial<ListSort<UserSortField>> & {
  include_deleted: boolean
  page?: number
  limit?: number
}

export type { Page } from "../../../shared/api/types"
