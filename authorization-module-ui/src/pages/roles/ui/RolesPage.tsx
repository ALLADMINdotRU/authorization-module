import { Box, Button } from "@mui/material"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { PageHeader } from "../../../shared/ui/page-header"

export const RolesPage = () => {
  const { t } = useTranslation()

  return (
    <Box sx={{ p: 2 }}>
      <PageHeader title={t("roles.title")} />
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Button component={Link} to="/main" variant="outlined">
          {t("common.back")}
        </Button>
        <Button component={Link} to="/roles/create" variant="contained">
          {t("common.create")}
        </Button>
      </Box>
    </Box>
  )
}
