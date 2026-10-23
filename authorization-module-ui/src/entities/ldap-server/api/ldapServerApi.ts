import { baseApi } from "../../../shared/api/baseApi"
import type { Page } from "../../../shared/api/types"
import type {
  LdapServer,
  LdapServerCreate,
  LdapServerUpdate,
  ListLdapServersArgs,
} from "../model/types"

export const ldapServerApi = baseApi.injectEndpoints({
  endpoints: build => ({
    listLdapServers: build.query<Page<LdapServer>, ListLdapServersArgs>({
      query: ({ page = 1, limit = 20 }) => ({
        url: "/auth/admin/rest/ldap-servers",
        method: "GET",
        params: { page, limit },
      }),
      providesTags: ["LdapServers"],
    }),
    getLdapServer: build.query<LdapServer, number>({
      query: id => ({
        url: `/auth/admin/rest/ldap-servers/${String(id)}`,
        method: "GET",
      }),
    }),
    createLdapServer: build.mutation<LdapServer, LdapServerCreate>({
      query: body => ({
        url: "/auth/admin/rest/ldap-servers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["LdapServers"],
    }),
    updateLdapServer: build.mutation<
      LdapServer,
      { id: number; data: LdapServerUpdate }
    >({
      query: ({ id, data }) => ({
        url: `/auth/admin/rest/ldap-servers/${String(id)}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["LdapServers"],
    }),
    deleteLdapServer: build.mutation<undefined, number>({
      query: id => ({
        url: `/auth/admin/rest/ldap-servers/${String(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: ["LdapServers"],
    }),
    testLdapServer: build.mutation<
      { success: boolean; message: string },
      number
    >({
      query: id => ({
        url: `/auth/admin/rest/ldap-servers/${String(id)}/test`,
        method: "POST",
      }),
    }),
  }),
})

export const {
  useListLdapServersQuery,
  useGetLdapServerQuery,
  useCreateLdapServerMutation,
  useUpdateLdapServerMutation,
  useDeleteLdapServerMutation,
  useTestLdapServerMutation,
} = ldapServerApi
