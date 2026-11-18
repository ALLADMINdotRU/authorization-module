import { Box, Button } from "@mui/material"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

export const MainPage = () => {
  const { t } = useTranslation()

  return (
    <Box sx={{ p: 2 }}>
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
