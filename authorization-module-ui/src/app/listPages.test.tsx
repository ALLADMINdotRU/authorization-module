import { createTheme, ThemeProvider } from "@mui/material"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LdapServersPage } from "../pages/ldap-servers"
import { RolesPage } from "../pages/roles"
import { UsersPage } from "../pages/users"
import i18n from "./i18n"
import { makeStore } from "./store"

vi.hoisted(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000")
})

const theme = createTheme()

beforeEach(async () => {
  await i18n.changeLanguage("en")
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const renderList = (
  page: React.ReactElement,
  response: Response,
  isMobile: boolean,
) => {
  vi.stubGlobal("matchMedia", () => ({
    matches: isMobile,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  const fetchMock = vi.fn().mockResolvedValueOnce(response)
  vi.stubGlobal("fetch", fetchMock)

  render(
    <Provider store={makeStore()}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>{page}</MemoryRouter>
      </ThemeProvider>
    </Provider>,
  )

  return fetchMock
}

describe.each([
  {
    name: "users",
    Page: UsersPage,
    item: { id: 1, username: "test.user", is_active: true },
  },
  { name: "roles", Page: RolesPage, item: { id: 1, name: "Test role" } },
  {
    name: "LDAP servers",
    Page: LdapServersPage,
    item: { id: 1, name: "Test server", host: "ldap.test", port: 389 },
  },
])("$name list", ({ name, Page, item }) => {
  describe.each([
    { viewport: "desktop", isMobile: false },
    { viewport: "mobile", isMobile: true },
  ])("$viewport", ({ isMobile }) => {
    const listControl = isMobile ? "combobox" : "table"

    it("hides the list and actions while loading and after access is denied", async () => {
      const detail = "Недостаточно прав (требуется роль admin)"
      renderList(<Page />, Response.json({ detail }, { status: 403 }), isMobile)

      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
      expect(screen.queryByRole(listControl)).not.toBeInTheDocument()
      expect(
        screen.queryByRole("link", { name: "Create" }),
      ).not.toBeInTheDocument()

      expect(await screen.findByText(detail)).toBeInTheDocument()
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
      expect(
        screen.queryByText(`Failed to load ${name}`),
      ).not.toBeInTheDocument()
      expect(screen.queryByRole(listControl)).not.toBeInTheDocument()
      expect(
        screen.queryByRole("link", { name: "Create" }),
      ).not.toBeInTheDocument()
    })

    it("shows the list and actions after a successful response", async () => {
      renderList(
        <Page />,
        Response.json({
          items: [item],
          total: 1,
          page: 1,
          limit: 20,
          pages: 1,
        }),
        isMobile,
      )

      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
      expect(await screen.findByRole(listControl)).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Create" })).toBeInTheDocument()
    })
  })
})

it("shows progress when sorting a loaded list", async () => {
  const firstPage = {
    items: [{ id: 1, name: "First role" }],
    total: 1,
    page: 1,
    limit: 20,
    pages: 1,
  }
  const fetchMock = renderList(<RolesPage />, Response.json(firstPage), false)
  fetchMock.mockResolvedValueOnce(
    Response.json({ ...firstPage, items: [{ id: 2, name: "Second role" }] }),
  )

  expect(await screen.findByText("First role")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "ID" }))

  expect(screen.getByRole("progressbar")).toBeInTheDocument()
  expect(screen.getByText("First role")).toBeInTheDocument()
  expect(await screen.findByText("Second role")).toBeInTheDocument()
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
})
