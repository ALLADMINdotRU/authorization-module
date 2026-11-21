import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { makeStore } from "../../app/store"
import { roleApi } from "../../entities/role/api/roleApi"
import { authApi, clearUser, selectUser, setUser } from "../../features/auth"

vi.hoisted(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000")
})

const user = {
  id: 1,
  username: "test-user",
  email: null,
  full_name: null,
  company: null,
  department: null,
  position: null,
  mobile_phone: null,
  ip_phone: null,
  messenger: null,
  auth_method: "local",
  created_at: "2026-11-20T00:00:00Z",
  is_active: true,
}
const role = { id: 1, name: "Test role", description: null }
const fetchMock = vi.fn<(request: Request) => Promise<Response>>()
const unauthorized = () =>
  Response.json({ detail: "Unauthorized" }, { status: 401 })
const refreshed = () => Response.json({ message: "Tokens refreshed" })

const deferredResponse = () => {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>(done => {
    resolve = done
  })
  return { promise, resolve }
}

const requests = () =>
  fetchMock.mock.calls.map(
    ([request]) => `${request.method} ${new URL(request.url).pathname}`,
  )

describe("automatic session refresh", () => {
  let store: ReturnType<typeof makeStore>

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    store = makeStore()
    store.dispatch(setUser(user))
  })

  afterEach(() => {
    store.dispatch(clearUser())
    vi.unstubAllGlobals()
  })

  it("shares one refresh even when a parallel 401 arrives after rotation", async () => {
    const delayed = deferredResponse()
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockReturnValueOnce(delayed.promise)
      .mockResolvedValueOnce(refreshed())
      .mockResolvedValueOnce(Response.json(role))
      .mockResolvedValueOnce(Response.json({ ...role, id: 2 }))

    const first = store.dispatch(roleApi.endpoints.getRole.initiate(1))
    const second = store.dispatch(roleApi.endpoints.getRole.initiate(2))
    await expect(first.unwrap()).resolves.toEqual(role)
    delayed.resolve(unauthorized())
    await expect(second.unwrap()).resolves.toMatchObject({ id: 2 })

    expect(requests()).toEqual([
      "GET /auth/admin/rest/roles/1",
      "GET /auth/admin/rest/roles/2",
      "POST /auth/refresh",
      "GET /auth/admin/rest/roles/1",
      "GET /auth/admin/rest/roles/2",
    ])
    expect(
      fetchMock.mock.calls.every(
        ([request]) => request.credentials === "include",
      ),
    ).toBe(true)
  })

  it("replays a protected mutation with its original body only once", async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(refreshed())
      .mockResolvedValueOnce(unauthorized())

    const data = { name: "Changed role" }
    const mutation = store.dispatch(
      roleApi.endpoints.updateRole.initiate({ id: 1, data }),
    )
    await mutation

    expect(requests()).toEqual([
      "PATCH /auth/admin/rest/roles/1",
      "POST /auth/refresh",
      "PATCH /auth/admin/rest/roles/1",
    ])
    expect(await fetchMock.mock.calls[0][0].json()).toEqual(data)
    expect(await fetchMock.mock.calls[2][0].json()).toEqual(data)
    expect(selectUser(store.getState())).toBeNull()
  })

  it("clears the session when the refresh cookie is rejected", async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(unauthorized())

    const query = store.dispatch(roleApi.endpoints.getRole.initiate(1))
    await query

    expect(requests()).toEqual([
      "GET /auth/admin/rest/roles/1",
      "POST /auth/refresh",
    ])
    expect(selectUser(store.getState())).toBeNull()
    expect(sessionStorage.getItem("auth_user")).toBeNull()
  })

  it("preserves a failed profile request after login while the session is empty", async () => {
    store.dispatch(clearUser())
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(unauthorized())

    const me = store.dispatch(authApi.endpoints.me.initiate(undefined))
    await expect(me.unwrap()).rejects.toMatchObject({ status: 401 })
    expect(requests()).toEqual(["GET /auth/me", "POST /auth/refresh"])
  })

  it("keeps the session after a temporary refresh failure and tries again on a later 401", async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(
        Response.json({ detail: "Unavailable" }, { status: 503 }),
      )
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(refreshed())
      .mockResolvedValueOnce(Response.json(role))

    const first = store.dispatch(roleApi.endpoints.getRole.initiate(1))
    await expect(first.unwrap()).rejects.toMatchObject({ status: 503 })
    expect(selectUser(store.getState())).toEqual(user)

    const later = store.dispatch(roleApi.endpoints.getRole.initiate(1))
    await expect(later.unwrap()).resolves.toEqual(role)
    expect(
      requests().filter(request => request === "POST /auth/refresh"),
    ).toHaveLength(2)
  })

  it("keeps the shared refresh running after the request that started it is aborted", async () => {
    const rotation = deferredResponse()
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockReturnValueOnce(rotation.promise)
      .mockResolvedValueOnce(Response.json({ ...role, id: 2 }))

    const first = store.dispatch(roleApi.endpoints.getRole.initiate(1))
    await vi.waitFor(() => {
      expect(requests()).toContain("POST /auth/refresh")
    })
    const second = store.dispatch(roleApi.endpoints.getRole.initiate(2))
    first.abort()
    await expect(first.unwrap()).rejects.toMatchObject({ name: "AbortError" })
    expect(fetchMock.mock.calls[1][0].signal.aborted).toBe(false)

    rotation.resolve(refreshed())
    await expect(second.unwrap()).resolves.toMatchObject({ id: 2 })
    expect(requests()).toEqual([
      "GET /auth/admin/rest/roles/1",
      "POST /auth/refresh",
      "GET /auth/admin/rest/roles/2",
    ])
  })

  it("waits for rotation before sending logout and skips retries from that session", async () => {
    const rotation = deferredResponse()
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockReturnValueOnce(rotation.promise)
      .mockResolvedValueOnce(unauthorized())

    const query = store.dispatch(roleApi.endpoints.getRole.initiate(1))
    await vi.waitFor(() => {
      expect(requests()).toContain("POST /auth/refresh")
    })
    const logout = store.dispatch(authApi.endpoints.logout.initiate(undefined))
    await Promise.resolve()
    expect(requests()).toEqual([
      "GET /auth/admin/rest/roles/1",
      "POST /auth/refresh",
    ])

    rotation.resolve(refreshed())
    await expect(query.unwrap()).rejects.toMatchObject({
      status: "FETCH_ERROR",
    })
    await expect(logout.unwrap()).rejects.toMatchObject({ status: 401 })
    expect(requests()).toEqual([
      "GET /auth/admin/rest/roles/1",
      "POST /auth/refresh",
      "POST /auth/logout",
    ])
  })

  it("does not refresh for a denied permission or an unsuccessful login", async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ detail: "Forbidden" }, { status: 403 }),
      )
      .mockResolvedValueOnce(unauthorized())

    const query = store.dispatch(roleApi.endpoints.getRole.initiate(1))
    await expect(query.unwrap()).rejects.toMatchObject({ status: 403 })
    const login = store.dispatch(
      authApi.endpoints.login.initiate({
        username: "other-user",
        password: "test",
      }),
    )
    await expect(login.unwrap()).rejects.toMatchObject({ status: 401 })

    expect(requests()).toEqual([
      "GET /auth/admin/rest/roles/1",
      "POST /auth/login",
    ])
  })
})
