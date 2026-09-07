import { Box, Button } from "@mui/material"
import { Link } from "react-router-dom"
import { PageHeader } from "../../../shared/ui/page-header"

export const RolesPage = () => (
  <Box sx={{ p: 2 }}>
    <PageHeader title="Роли" />
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Button component={Link} to="/main" variant="outlined">
        Назад
      </Button>
      <Button component={Link} to="/roles/create" variant="contained">
        Создать
      </Button>
    </Box>
  </Box>
)
