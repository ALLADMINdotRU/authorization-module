import { Box, Button } from "@mui/material"
import { Link, useNavigate } from "react-router-dom"
import { useAppDispatch } from "../../../app/hooks"
import { clearUser, useLogoutMutation } from "../../../features/auth"
import { PageHeader } from "../../../shared/ui/page-header"

export const MainPage = () => {
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
        <PageHeader title="Главная" />
        <Button
          onClick={() => {
            void handleLogout()
          }}
          variant="outlined"
          color="error"
        >
          Выход
        </Button>
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
          Пользователи
        </Button>
        <Button component={Link} to="/roles" variant="outlined">
          Роли
        </Button>
        <Button component={Link} to="/ldap-servers" variant="outlined">
          LDAP-серверы
        </Button>
      </Box>
    </Box>
  )
}
