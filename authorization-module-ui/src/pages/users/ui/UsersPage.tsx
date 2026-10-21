import { useEffect, useState } from "react"
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
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
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
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const { data, error, isLoading } = useListUsersQuery({
    include_deleted: showDeleted,
    page,
    limit,
  })
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation()
  const [restoreUser, { isLoading: isRestoring }] = useRestoreUserMutation()
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const users = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.pages ?? 0
  const isMobile = useMediaQuery(theme => theme.breakpoints.down("sm"))

  useEffect(() => {
    if (data && data.pages > 0 && page > data.pages) {
      setPage(data.pages)
    }
  }, [data, page])

  const handleShowDeletedChange = (checked: boolean) => {
    setShowDeleted(checked)
    setPage(1)
  }

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
                  handleShowDeletedChange(event.target.checked)
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
        <>
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
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_event, value) => {
                setPage(value)
              }}
              color="primary"
            />
          </Box>
        </>
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

      {!isMobile && total > 0 && (
        <TablePagination
          component="div"
          count={total}
          page={page - 1}
          onPageChange={(_event, newPage) => {
            setPage(newPage + 1)
          }}
          rowsPerPage={limit}
          onRowsPerPageChange={event => {
            setLimit(Number.parseInt(event.target.value, 10))
            setPage(1)
          }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="Строк на странице:"
          labelDisplayedRows={({ from, to, count }) =>
            `${String(from)}–${String(to)} из ${String(count)}`
          }
        />
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
