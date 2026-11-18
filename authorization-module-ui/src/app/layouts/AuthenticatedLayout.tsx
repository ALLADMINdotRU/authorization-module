import { Button } from "@mui/material"
import type { ParseKeys } from "i18next"
import { useTranslation } from "react-i18next"
import { Link, Outlet, useMatches, useNavigate } from "react-router-dom"
import { useAppDispatch } from "../hooks"
import { clearUser, useLogoutMutation } from "../../features/auth"
import { LanguageSwitcher } from "../../shared/ui/language-switcher"
import { PageHeader } from "../../shared/ui/page-header"

export type PageRouteHandle = {
  titleKey: ParseKeys
}

export const AuthenticatedLayout = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
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
          <>
            <Button component={Link} to="/me" variant="outlined">
              {t("navigation.profile")}
            </Button>
            <LanguageSwitcher />
            <Button
              onClick={() => {
                void handleLogout()
              }}
              variant="outlined"
              color="error"
              disabled={isLoggingOut}
            >
              {t("common.logout")}
            </Button>
          </>
        }
      />
      <Outlet />
    </>
  )
}
