import { baseApi } from "../../../shared/api/baseApi"
import type { User, UserCreate, UserUpdate } from "../model/types"

export const userApi = baseApi.injectEndpoints({
  endpoints: build => ({
    listUsers: build.query<User[], undefined>({
      query: () => ({ url: "/auth/admin/rest/users", method: "GET" }),
      providesTags: ["Users"],
    }),
    getUser: build.query<User, number>({
      query: id => ({ url: `/auth/admin/rest/users/${String(id)}`, method: "GET" }),
    }),
    createUser: build.mutation<User, UserCreate>({
      query: body => ({ url: "/auth/admin/rest/users", method: "POST", body }),
      invalidatesTags: ["Users"],
    }),
    updateUser: build.mutation<User, { id: number; data: UserUpdate }>({
      query: ({ id, data }) => ({
        url: `/auth/admin/rest/users/${String(id)}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Users"],
    }),
    deleteUser: build.mutation<undefined, number>({
      query: id => ({
        url: `/auth/admin/rest/users/${String(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),
  }),
})

export const {
  useListUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = userApi
