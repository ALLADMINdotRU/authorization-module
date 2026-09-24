import { useState } from "react"
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from "@mui/material"
import { Link } from "react-router-dom"
import {
  useDeleteUserMutation,
  useListUsersQuery,
  useRestoreUserMutation,
} from "../../../entities/user"
import type { User } from "../../../entities/user"
import { PageHeader } from "../../../shared/ui/page-header"

type UserActionsProps = {
  user: User
  onDelete: (user: User) => void
  onRestore: (user: User) => void
  isRestoring?: boolean
}

const UserActions = ({
  user,
  onDelete,
  onRestore,
  isRestoring,
}: UserActionsProps) => (
  <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
    <Button
      component={Link}
      to={`/users/${String(user.id)}/edit`}
      size="small"
      variant="outlined"
    >
      Редактировать
    </Button>
    {user.is_deleted ? (
      <Button
        size="small"
        variant="outlined"
        color="success"
        disabled={isRestoring}
        onClick={() => {
          onRestore(user)
        }}
      >
        Восстановить
      </Button>
    ) : (
      <Button
        size="small"
        variant="outlined"
        color="error"
        onClick={() => {
          onDelete(user)
        }}
      >
        Удалить
      </Button>
    )}
  </Box>
)

export const UsersPage = () => {
  const [showDeleted, setShowDeleted] = useState(false)
  const { data, error, isLoading } = useListUsersQuery(showDeleted)
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation()
  const [restoreUser, { isLoading: isRestoring }] = useRestoreUserMutation()
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const users = data ?? []
  const isMobile = useMediaQuery(theme => theme.breakpoints.down("sm"))

  const openDeleteDialog = (user: User) => {
    setDeleteError(null)
    setUserToDelete(user)
  }

  const closeDeleteDialog = () => {
    setDeleteError(null)
    setUserToDelete(null)
  }

  const handleDelete = async () => {
    if (!userToDelete) {
      return
    }
    setDeleteError(null)
    try {
      await deleteUser(userToDelete.id).unwrap()
      setUserToDelete(null)
    } catch {
      setDeleteError("Не удалось удалить пользователя")
    }
  }

  const handleRestore = async (user: User) => {
    setRestoreError(null)
    try {
      await restoreUser(user.id).unwrap()
    } catch {
      setRestoreError("Не удалось восстановить пользователя")
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <PageHeader title="Пользователи" />
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Button component={Link} to="/main" variant="outlined">
          Назад
        </Button>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={showDeleted}
                onChange={event => {
                  setShowDeleted(event.target.checked)
                }}
              />
            }
            label="Показывать удалённых пользователей"
          />
          <Button component={Link} to="/users/create" variant="contained">
            Создать
          </Button>
        </Box>
      </Box>

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          Не удалось загрузить пользователей
        </Typography>
      )}

      {restoreError && (
        <Typography color="error" sx={{ mb: 2 }}>
          {restoreError}
        </Typography>
      )}

      {!isLoading && !error && users.length === 0 && (
        <Typography color="text.secondary">Нет пользователей</Typography>
      )}

      {users.length > 0 && isMobile && (
        <Stack spacing={1}>
          {users.map(user => (
            <Card key={user.id}>
              <CardContent>
                <Typography variant="h6" component="div">
                  {user.full_name ?? user.username}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.username}
                </Typography>
                <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                  <Chip
                    label={user.is_active ? "Активен" : "Неактивен"}
                    color={user.is_active ? "success" : "default"}
                    size="small"
                  />
                  {user.is_deleted && (
                    <Chip label="Удалён" color="error" size="small" />
                  )}
                </Box>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2">{user.email ?? "—"}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {[user.company, user.department]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.position ?? "—"}
                </Typography>
              </CardContent>
              <CardActions>
                <UserActions
                  user={user}
                  onDelete={openDeleteDialog}
                  onRestore={user => {
                    void handleRestore(user)
                  }}
                  isRestoring={isRestoring}
                />
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}

      {users.length > 0 && !isMobile && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Логин</TableCell>
                <TableCell>ФИО</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Компания</TableCell>
                <TableCell>Отдел</TableCell>
                <TableCell>Должность</TableCell>
                <TableCell>Активен</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.full_name ?? "—"}</TableCell>
                  <TableCell>{user.email ?? "—"}</TableCell>
                  <TableCell>{user.company ?? "—"}</TableCell>
                  <TableCell>{user.department ?? "—"}</TableCell>
                  <TableCell>{user.position ?? "—"}</TableCell>
                  <TableCell>
                    {user.is_deleted ? "Удалён" : user.is_active ? "Да" : "Нет"}
                  </TableCell>
                  <TableCell>
                    <UserActions
                      user={user}
                      onDelete={openDeleteDialog}
                      onRestore={user => {
                        void handleRestore(user)
                      }}
                      isRestoring={isRestoring}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={userToDelete !== null} onClose={closeDeleteDialog}>
        <DialogTitle>Удалить пользователя?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Пользователь «{userToDelete?.username}» будет удалён безвозвратно.
          </DialogContentText>
          {deleteError && (
            <Typography color="error" sx={{ mt: 1 }}>
              {deleteError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            disabled={isDeleting}
            onClick={() => {
              void handleDelete()
            }}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
