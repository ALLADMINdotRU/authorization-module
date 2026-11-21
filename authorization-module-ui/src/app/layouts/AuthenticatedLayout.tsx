import type { ParseKeys } from "i18next"
import { useTranslation } from "react-i18next"
import { Outlet, useMatches, useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../hooks"
import {
  clearUser,
  selectUser,
  useLogoutMutation,
  useMeQuery,
} from "../../features/auth"
import { PageHeader } from "../../shared/ui/page-header"
import { UserMenu } from "./UserMenu"

export type PageRouteHandle = {
  titleKey: ParseKeys
}

export const AuthenticatedLayout = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const storedUser = useAppSelector(selectUser)
  const { data: profile } = useMeQuery(undefined, { skip: !storedUser })
  const user = profile ?? storedUser
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation()
  const matches = useMatches()
  const page = matches.at(-1)?.handle as PageRouteHandle | undefined

  const handleLogout = async () => {
    try {
      await logout(undefined).unwrap()
    } catch {
      // Очищаем сессию на клиенте даже при сбое запроса.
    }
    dispatch(clearUser())
    await navigate("/")
  }

  return (
    <>
      <PageHeader
        title={t(page?.titleKey ?? "navigation.home")}
        actions={
          user && (
            <UserMenu
              user={user}
              isLoggingOut={isLoggingOut}
              onLogout={() => {
                void handleLogout()
              }}
            />
          )
        }
      />
      <Outlet />
    </>
  )
}
