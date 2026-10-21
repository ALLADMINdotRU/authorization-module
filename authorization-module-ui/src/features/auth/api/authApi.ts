import { baseApi } from "../../../shared/api/baseApi"
import type { User } from "../../../entities/user/model/types"
import type { LoginRequest } from "../model/types"

export const authApi = baseApi.injectEndpoints({
  endpoints: build => ({
    login: build.mutation<undefined, LoginRequest>({
      query: ({ username, password }) => ({
        url: "/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username,
          password,
          grant_type: "password",
        }).toString(),
      }),
    }),
    me: build.query<User, undefined>({
      query: () => ({ url: "/auth/me", method: "GET" }),
    }),
    logout: build.mutation<undefined, undefined>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
    }),
  }),
})

export const {
  useLazyMeQuery,
  useLoginMutation,
  useLogoutMutation,
  useMeQuery,
} = authApi
