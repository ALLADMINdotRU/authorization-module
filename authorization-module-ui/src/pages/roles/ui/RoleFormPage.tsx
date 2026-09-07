import { Box } from "@mui/material"
import { useParams } from "react-router-dom"
import { PageHeader } from "../../../shared/ui/page-header"

export const RoleFormPage = () => {
  const { id } = useParams()

  const title = id ? "Редактирование роли" : "Создание роли"

  return (
    <Box sx={{ p: 2 }}>
      <PageHeader title={title} />
    </Box>
  )
}
