import { Box } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { PageHeader } from "../../../shared/ui/page-header"

export const LdapServerFormPage = () => {
  const { id } = useParams()
  const { t } = useTranslation()

  const title = id ? t("ldapServers.editTitle") : t("ldapServers.createTitle")

  return (
    <Box sx={{ p: 2 }}>
      <PageHeader title={title} />
    </Box>
  )
}
