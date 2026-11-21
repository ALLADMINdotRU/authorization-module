import { createBrowserRouter, type RouteObject } from "react-router-dom"
import { RequireAuth } from "../../features/auth"
import {
  LdapServerFormPage,
  LdapServersPage,
  LdapUsersPage,
} from "../../pages/ldap-servers"
import { LoginPage } from "../../pages/login"
import { MainPage } from "../../pages/main"
import { ProfilePage } from "../../pages/profile"
import { RoleFormPage, RolesPage } from "../../pages/roles"
import { UserFormPage, UsersPage } from "../../pages/users"
import {
  AuthenticatedLayout,
  type PageRouteHandle,
} from "../layouts/AuthenticatedLayout"

const authenticatedPages = [
  {
    path: "/main",
    element: <MainPage />,
    handle: { titleKey: "navigation.home" },
  },
  {
    path: "/me",
    element: <ProfilePage />,
    handle: { titleKey: "navigation.profile" },
  },
  {
    path: "/users",
    element: <UsersPage />,
    handle: { titleKey: "users.title" },
  },
  {
    path: "/users/create",
    element: <UserFormPage />,
    handle: { titleKey: "userForm.createTitle" },
  },
  {
    path: "/users/:id/edit",
    element: <UserFormPage />,
    handle: { titleKey: "userForm.editTitle" },
  },
  {
    path: "/roles",
    element: <RolesPage />,
    handle: { titleKey: "roles.title" },
  },
  {
    path: "/roles/create",
    element: <RoleFormPage />,
    handle: { titleKey: "roles.createTitle" },
  },
  {
    path: "/roles/:id/edit",
    element: <RoleFormPage />,
    handle: { titleKey: "roles.editTitle" },
  },
  {
    path: "/ldap-servers",
    element: <LdapServersPage />,
    handle: { titleKey: "ldapServers.title" },
  },
  {
    path: "/ldap-servers/create",
    element: <LdapServerFormPage />,
    handle: { titleKey: "ldapServers.createTitle" },
  },
  {
    path: "/ldap-servers/:id/edit",
    element: <LdapServerFormPage />,
    handle: { titleKey: "ldapServers.editTitle" },
  },
  {
    path: "/ldap-servers/:id/users",
    element: <LdapUsersPage />,
    handle: { titleKey: "ldapUsers.title" },
  },
] satisfies (RouteObject & { handle: PageRouteHandle })[]

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    element: (
      <RequireAuth>
        <AuthenticatedLayout />
      </RequireAuth>
    ),
    children: authenticatedPages,
  },
])
