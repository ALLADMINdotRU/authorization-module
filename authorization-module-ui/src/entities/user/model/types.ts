export type User = {
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
