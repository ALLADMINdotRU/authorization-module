import { baseApi } from "../../../shared/api/baseApi"
import type { Page } from "../../../shared/api/types"
import type {
  ListRolesArgs,
  Role,
  RoleCreate,
  RoleUpdate,
} from "../model/types"

export const roleApi = baseApi.injectEndpoints({
  endpoints: build => ({
    listRoles: build.query<Page<Role>, ListRolesArgs>({
      query: ({ page = 1, limit = 20 }) => ({
        url: "/auth/admin/rest/roles",
        method: "GET",
        params: { page, limit },
      }),
      providesTags: ["Roles"],
    }),
    getRole: build.query<Role, number>({
      query: id => ({
        url: `/auth/admin/rest/roles/${String(id)}`,
        method: "GET",
      }),
    }),
    createRole: build.mutation<Role, RoleCreate>({
      query: body => ({ url: "/auth/admin/rest/roles", method: "POST", body }),
      invalidatesTags: ["Roles"],
    }),
    updateRole: build.mutation<Role, { id: number; data: RoleUpdate }>({
      query: ({ id, data }) => ({
        url: `/auth/admin/rest/roles/${String(id)}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Roles"],
    }),
    deleteRole: build.mutation<undefined, number>({
      query: id => ({
        url: `/auth/admin/rest/roles/${String(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Roles"],
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
