import type { UserProfile } from "../../user"
import { baseApi } from "../../../shared/api/baseApi"
import type { Page } from "../../../shared/api/types"
import type {
  ImportLdapUserArgs,
  LdapServer,
  LdapServerCreate,
  LdapServerUpdate,
  LdapUser,
  ListLdapServersArgs,
  ListLdapUsersArgs,
} from "../model/types"

const ldapServersListTag = { type: "LdapServers", id: "LIST" } as const

type LdapServerTestResult = { success: boolean; message?: string }

export const ldapServerApi = baseApi.injectEndpoints({
  endpoints: build => ({
    listLdapServers: build.query<Page<LdapServer>, ListLdapServersArgs>({
      query: ({ page = 1, limit = 20, sort_by, sort_order }) => ({
        url: "/auth/admin/rest/ldap-servers",
        method: "GET",
        params: { page, limit, sort_by, sort_order },
      }),
      providesTags: [ldapServersListTag],
    }),
    listLdapUsers: build.query<Page<LdapUser>, ListLdapUsersArgs>({
      query: ({ serverId, page, limit }) => ({
        url: `/auth/admin/rest/ldap-servers/${String(serverId)}/users`,
        params: { page, limit },
      }),
      extraOptions: { skipErrorNotification: true },
      providesTags: (_result, _error, { serverId }) => [
        { type: "LdapUsers", id: serverId },
      ],
    }),
    importLdapUser: build.mutation<UserProfile, ImportLdapUserArgs>({
      query: ({ serverId, username, is_active }) => ({
        url: `/auth/admin/rest/ldap-servers/${String(serverId)}/import`,
        method: "POST",
        body: { username, is_active },
      }),
      extraOptions: { skipErrorNotification: true },
      invalidatesTags: (user, _error, { serverId }) =>
        user
          ? [
              { type: "LdapUsers", id: serverId },
              { type: "Users", id: "LIST" },
              { type: "Users", id: user.id },
              { type: "Profile", id: user.id },
            ]
          : [],
    }),
    getLdapServer: build.query<LdapServer, number>({
      query: id => ({
        url: `/auth/admin/rest/ldap-servers/${String(id)}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
      providesTags: (_result, _error, id) => [{ type: "LdapServers", id }],
    }),
    createLdapServer: build.mutation<LdapServer, LdapServerCreate>({
      query: body => ({
        url: "/auth/admin/rest/ldap-servers",
        method: "POST",
        body,
      }),
      invalidatesTags: [ldapServersListTag],
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
      invalidatesTags: (_result, error) => (error ? [] : [ldapServersListTag]),
    }),
    deleteLdapServer: build.mutation<undefined, number>({
      query: id => ({
        url: `/auth/admin/rest/ldap-servers/${String(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, error, id) =>
        error ? [] : [ldapServersListTag, { type: "LdapServers", id }],
    }),
    testLdapServer: build.mutation<LdapServerTestResult, number>({
      query: id => ({
        url: `/auth/admin/rest/ldap-servers/${String(id)}/test`,
        method: "POST",
      }),
      // Older backends unpacked the successful response into its keys.
      transformResponse: (
        result:
          LdapServerTestResult | { success: "success"; message: "message" },
      ): LdapServerTestResult =>
        result.success === "success" ? { success: true } : result,
      extraOptions: { skipErrorNotification: true },
    }),
  }),
})

export const {
  useListLdapServersQuery,
  useListLdapUsersQuery,
  useImportLdapUserMutation,
  useGetLdapServerQuery,
  useCreateLdapServerMutation,
  useUpdateLdapServerMutation,
  useDeleteLdapServerMutation,
  useTestLdapServerMutation,
} = ldapServerApi
