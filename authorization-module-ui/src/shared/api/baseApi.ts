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

export const getApiErrorDetail = (data: unknown): string | undefined => {
  if (
    data &&
    typeof data === "object" &&
    "detail" in data &&
    typeof data.detail === "string" &&
    data.detail.trim()
  ) {
    return data.detail
  }

  return undefined
}

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  { skipErrorNotification?: boolean } | undefined
> = async (args, api, extraOptions = {}) => {
  const result = await baseQuery(args, api, extraOptions)
  if (api.signal.aborted) {
    return result
  }

  const url = typeof args === "string" ? args : args.url

  if (result.error?.status === 401 && url !== "/auth/login") {
    api.dispatch(clearUser())
  }

  if (result.error?.status === 400 && !extraOptions.skipErrorNotification) {
    const detail = getApiErrorDetail(result.error.data)
    if (detail) {
      api.dispatch(showNotification({ message: detail, severity: "error" }))
    }
  }

  return result
}

export const baseApi = createApi({
  reducerPath: "api",
  tagTypes: ["Users", "LdapServers", "Roles"],
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
})
