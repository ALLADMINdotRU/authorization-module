import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import type {
  BaseQueryApi,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query"
import type { RootState } from "../../app/store"
import { clearUser, selectUser } from "../../features/auth/model/authSlice"
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

type QueryOptions = {
  skipErrorNotification?: boolean
  changesSession?: boolean
}

type QueryResult = Awaited<ReturnType<typeof baseQuery>>

type SessionRequests = {
  version: number
  pending?: Promise<QueryResult>
  lastRefresh?: Promise<QueryResult>
}

const sessionRequests = new WeakMap<BaseQueryApi["dispatch"], SessionRequests>()

const cancelledRequest = (): QueryResult => ({
  error: { status: "FETCH_ERROR", error: "Request cancelled" },
})

// Login and logout must use the cookies left by any outstanding refresh.
const runSessionRequest = (
  requests: SessionRequests,
  send: () => Promise<QueryResult>,
) => {
  const request = requests.pending ? requests.pending.then(send, send) : send()

  requests.pending = request
  const release = () => {
    if (requests.pending === request) requests.pending = undefined
  }

  void request.then(release, release)
  return request
}

const expireSession = (api: BaseQueryApi, requests: SessionRequests) => {
  if (!selectUser(api.getState() as RootState)) return

  requests.version += 1
  api.dispatch(clearUser())
}

const fetchWithReauth = async (
  args: string | FetchArgs,
  api: BaseQueryApi,
  options: QueryOptions,
  requests: SessionRequests,
) => {
  const version = requests.version
  const isCancelled = () => api.signal.aborted || version !== requests.version
  const pending = requests.pending

  if (pending) {
    if (pending !== requests.lastRefresh) return cancelledRequest()
    const refreshResult = await pending
    if (isCancelled()) return cancelledRequest()
    if (refreshResult.error) return refreshResult
  }

  const previousRefresh = requests.lastRefresh
  const result = await baseQuery(args, api, options)
  if (isCancelled()) return cancelledRequest()
  if (result.error?.status !== 401) return result

  // A delayed 401 can arrive after another request has already refreshed.
  let refresh = requests.lastRefresh
  if (
    !refresh ||
    (refresh === previousRefresh && refresh !== requests.pending)
  ) {
    refresh = runSessionRequest(requests, async () => {
      const refreshed = await baseQuery(
        { url: "/auth/refresh", method: "POST", timeout: 10_000 },
        { ...api, signal: new AbortController().signal },
        {},
      )
      if (refreshed.error?.status === 401 && version === requests.version) {
        expireSession(api, requests)
      }
      return refreshed
    })
    requests.lastRefresh = refresh
  }

  const refreshed = await refresh
  if (isCancelled()) return cancelledRequest()
  if (refreshed.error) return refreshed

  const retry = await baseQuery(args, api, options)
  if (isCancelled()) return cancelledRequest()
  if (retry.error?.status === 401) expireSession(api, requests)

  return retry
}

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  QueryOptions | undefined
> = async (args, api, extraOptions = {}) => {
  let requests = sessionRequests.get(api.dispatch)
  if (!requests) {
    requests = { version: 0 }
    sessionRequests.set(api.dispatch, requests)
  }

  let result: QueryResult
  if (extraOptions.changesSession) {
    requests.version += 1
    requests.lastRefresh = undefined
    result = await runSessionRequest(requests, async () =>
      api.signal.aborted
        ? cancelledRequest()
        : baseQuery(args, api, extraOptions),
    )
  } else {
    result = await fetchWithReauth(args, api, extraOptions, requests)
  }

  if (api.signal.aborted) return result

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
  tagTypes: ["Users", "LdapServers", "Roles", "Profile", "LdapUsers"],
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
})
