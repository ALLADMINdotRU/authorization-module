import { baseApi } from "../../../shared/api/baseApi"
import type { Page } from "../../../shared/api/types"
import type {
  ListRolesArgs,
  Role,
  RoleCreate,
  RoleUpdate,
} from "../model/types"

const rolesListTag = { type: "Roles", id: "LIST" } as const

export const roleApi = baseApi.injectEndpoints({
  endpoints: build => ({
    listRoles: build.query<Page<Role>, ListRolesArgs>({
      query: ({ page = 1, limit = 20, sort_by, sort_order }) => ({
        url: "/auth/admin/rest/roles",
        method: "GET",
        params: { page, limit, sort_by, sort_order },
      }),
      providesTags: [rolesListTag],
    }),
    getRole: build.query<Role, number>({
      query: id => ({
        url: `/auth/admin/rest/roles/${String(id)}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
      providesTags: (_result, _error, id) => [{ type: "Roles", id }],
    }),
    createRole: build.mutation<Role, RoleCreate>({
      query: body => ({ url: "/auth/admin/rest/roles", method: "POST", body }),
      invalidatesTags: [rolesListTag],
    }),
    updateRole: build.mutation<Role, { id: number; data: RoleUpdate }>({
      query: ({ id, data }) => ({
        url: `/auth/admin/rest/roles/${String(id)}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, error) => (error ? [] : [rolesListTag]),
    }),
    deleteRole: build.mutation<undefined, number>({
      query: id => ({
        url: `/auth/admin/rest/roles/${String(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, error, id) =>
        error ? [] : [rolesListTag, { type: "Roles", id }],
    }),
  }),
})

export const {
  useListRolesQuery,
  useGetRoleQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = roleApi
