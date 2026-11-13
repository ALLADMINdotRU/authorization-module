import { baseApi } from "../../../shared/api/baseApi"
import type {
  ListUsersArgs,
  Page,
  User,
  UserCreate,
  UserUpdate,
} from "../model/types"

const usersListTag = { type: "Users", id: "LIST" } as const

export const userApi = baseApi.injectEndpoints({
  endpoints: build => ({
    listUsers: build.query<Page<User>, ListUsersArgs>({
      query: ({
        include_deleted,
        page = 1,
        limit = 20,
        sort_by,
        sort_order,
      }) => ({
        url: "/auth/admin/rest/users",
        method: "GET",
        params: { include_deleted, page, limit, sort_by, sort_order },
      }),
      providesTags: [usersListTag],
    }),
    getUser: build.query<User, number>({
      query: id => ({
        url: `/auth/admin/rest/users/${String(id)}`,
        method: "GET",
      }),
      keepUnusedDataFor: 0,
      providesTags: (_result, _error, id) => [{ type: "Users", id }],
    }),
    createUser: build.mutation<User, UserCreate>({
      query: body => ({ url: "/auth/admin/rest/users", method: "POST", body }),
      invalidatesTags: [usersListTag],
    }),
    updateUser: build.mutation<User, { id: number; data: UserUpdate }>({
      query: ({ id, data }) => ({
        url: `/auth/admin/rest/users/${String(id)}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, error) => (error ? [] : [usersListTag]),
    }),
    uploadUserPhoto: build.mutation<
      { has_photo: boolean; url: string | null },
      { id: number; photo: Blob }
    >({
      query: ({ id, photo }) => {
        const body = new FormData()
        const extension = photo.type === "image/webp" ? "webp" : "png"
        body.append("file", photo, `avatar.${extension}`)

        return {
          url: `/auth/admin/rest/users/${String(id)}/photo`,
          method: "POST",
          body,
        }
      },
      extraOptions: { skipErrorNotification: true },
      invalidatesTags: (_result, error) => (error ? [] : [usersListTag]),
    }),
    deleteUser: build.mutation<undefined, number>({
      query: id => ({
        url: `/auth/admin/rest/users/${String(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, error, id) =>
        error ? [] : [usersListTag, { type: "Users", id }],
    }),
    restoreUser: build.mutation<User, number>({
      query: id => ({
        url: `/auth/admin/rest/users/${String(id)}/restore`,
        method: "POST",
      }),
      invalidatesTags: (_result, error, id) =>
        error ? [] : [usersListTag, { type: "Users", id }],
    }),
  }),
})

export const {
  useListUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useUploadUserPhotoMutation,
  useDeleteUserMutation,
  useRestoreUserMutation,
} = userApi
