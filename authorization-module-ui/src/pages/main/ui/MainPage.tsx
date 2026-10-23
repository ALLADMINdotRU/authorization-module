import { Box, Button } from "@mui/material"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"
import { useAppDispatch } from "../../../app/hooks"
import { clearUser, useLogoutMutation } from "../../../features/auth"
import { LanguageSwitcher } from "../../../shared/ui/language-switcher"
import { PageHeader } from "../../../shared/ui/page-header"

export const MainPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [logout] = useLogoutMutation()

  const handleLogout = async () => {
    try {
      await logout(undefined).unwrap()
    } catch {
      // даже если сервер недоступен — разлогиниваем на клиенте
    }
    dispatch(clearUser())
    await navigate("/")
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <PageHeader title={t("navigation.home")} />
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <LanguageSwitcher />
          <Button
            onClick={() => {
              void handleLogout()
            }}
            variant="outlined"
            color="error"
          >
            {t("common.logout")}
          </Button>
        </Box>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 1,
        }}
      >
        <Button component={Link} to="/users" variant="outlined">
          {t("navigation.users")}
        </Button>
        <Button component={Link} to="/roles" variant="outlined">
          {t("navigation.roles")}
        </Button>
        <Button component={Link} to="/ldap-servers" variant="outlined">
          {t("navigation.ldapServers")}
        </Button>
      </Box>
    </Box>
  )
}
