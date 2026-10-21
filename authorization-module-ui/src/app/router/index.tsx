import { createBrowserRouter, Outlet } from "react-router-dom"
import { RequireAuth } from "../../features/auth"
import { LdapServerFormPage, LdapServersPage } from "../../pages/ldap-servers"
import { LoginPage } from "../../pages/login"
import { MainPage } from "../../pages/main"
import { RoleFormPage, RolesPage } from "../../pages/roles"
import { UserFormPage, UsersPage } from "../../pages/users"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    element: (
      <RequireAuth>
        <Outlet />
      </RequireAuth>
    ),
    children: [
      {
        path: "/main",
        element: <MainPage />,
      },
      {
        path: "/users",
        element: <UsersPage />,
      },
      {
        path: "/users/create",
        element: <UserFormPage />,
      },
      {
        path: "/users/:id/edit",
        element: <UserFormPage />,
      },
      {
        path: "/roles",
        element: <RolesPage />,
      },
      {
        path: "/roles/create",
        element: <RoleFormPage />,
      },
      {
        path: "/roles/:id/edit",
        element: <RoleFormPage />,
      },
      {
        path: "/ldap-servers",
        element: <LdapServersPage />,
      },
      {
        path: "/ldap-servers/create",
        element: <LdapServerFormPage />,
      },
      {
        path: "/ldap-servers/:id/edit",
        element: <LdapServerFormPage />,
      },
    ],
  },
])
