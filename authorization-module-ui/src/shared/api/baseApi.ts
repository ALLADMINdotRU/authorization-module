import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query"
import { clearUser } from "../../features/auth/model/authSlice"
import { showNotification } from "../notifications"

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""

const baseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  credentials: "include",
})

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions)
  const url = typeof args === "string" ? args : args.url

  if (result.error?.status === 401 && url !== "/auth/login") {
    api.dispatch(clearUser())
  }

  if (result.error?.status === 400) {
    const { data } = result.error
    if (data && typeof data === "object" && "detail" in data) {
      const detail = (data as { detail?: unknown }).detail
      if (typeof detail === "string") {
        api.dispatch(showNotification({ message: detail, severity: "error" }))
      }
    }
  }

  return result
}

export const baseApi = createApi({
  reducerPath: "api",
  tagTypes: ["Users"],
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
})
