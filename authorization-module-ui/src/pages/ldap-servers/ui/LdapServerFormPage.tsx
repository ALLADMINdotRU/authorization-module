import { Box } from "@mui/material"
import { useParams } from "react-router-dom"
import { PageHeader } from "../../../shared/ui/page-header"

export const LdapServerFormPage = () => {
  const { id } = useParams()

  const title = id ? "Редактирование LDAP-сервера" : "Создание LDAP-сервера"

  return (
    <Box sx={{ p: 2 }}>
      <PageHeader title={title} />
    </Box>
  )
}
