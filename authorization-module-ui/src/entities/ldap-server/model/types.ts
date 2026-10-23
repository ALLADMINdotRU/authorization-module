export type LdapServer = {
  id: number
  name: string
  host: string
  port: number
  domain: string | null
  base_dn: string | null
  use_ssl: boolean
  bind_username: string | null
  search_filter: string
  is_active: boolean
  priority: number
  auto_login_enabled: boolean
  created_at: string
  updated_at: string
}

export type LdapServerCreate = {
  name: string
  host: string
  port?: number
  domain?: string | null
  base_dn?: string | null
  use_ssl?: boolean
  bind_username?: string | null
  bind_password?: string | null
  search_filter?: string
  is_active?: boolean
  priority?: number
  auto_login_enabled?: boolean
}

export type LdapServerUpdate = Partial<LdapServerCreate>

export type ListLdapServersArgs = {
  page?: number
  limit?: number
}
