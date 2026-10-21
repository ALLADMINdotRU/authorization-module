import { useState } from "react"
import type { SubmitEvent } from "react"
import { Box, Button, TextField, Typography } from "@mui/material"
import { useNavigate } from "react-router-dom"
import { useAppDispatch } from "../../../app/hooks"
import {
  setUser,
  useLazyMeQuery,
  useLoginMutation,
} from "../../../features/auth"

export const LoginPage = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [login, { isLoading, error }] = useLoginMutation()
  const [getMe] = useLazyMeQuery()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async () => {
    try {
      await login({ username, password }).unwrap()
      const user = await getMe(undefined).unwrap()
      dispatch(setUser(user))
      await navigate("/main")
    } catch {
      // Ошибка отображается через `error` из useLoginMutation
    }
  }

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    void handleLogin()
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #fdfdfd 0%, #bdc5f3 100%)",
        gap: 2,
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        Модуль авторизации
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2, width: 300 }}
      >
        <TextField
          label="Логин"
          value={username}
          onChange={event => {
            setUsername(event.target.value)
          }}
          required
        />
        <TextField
          label="Пароль"
          type="password"
          value={password}
          onChange={event => {
            setPassword(event.target.value)
          }}
          required
        />
        {error && (
          <Typography color="error">Неверный логин или пароль</Typography>
        )}
        <Button type="submit" variant="contained" disabled={isLoading}>
          Войти
        </Button>
      </Box>
    </Box>
  )
}
