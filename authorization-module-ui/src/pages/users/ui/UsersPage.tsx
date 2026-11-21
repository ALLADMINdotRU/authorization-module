import { useEffect, useState } from "react"
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  Chip,
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
import { useTranslation } from "react-i18next"
import {
  getUserPhotoUrl,
  useDeleteUserMutation,
  useListUsersQuery,
  useRestoreUserMutation,
} from "../../../entities/user"
import type { User, UserSortField } from "../../../entities/user"
import { getApiErrorDetail } from "../../../shared/api/baseApi"
import {
  ListProgress,
  ListSortControls,
  SortableTableCell,
  useListSort,
} from "../../../shared/ui/list-sort"

const tableFields = [
  "id",
  "avatar",
  "full_name",
  "username",
  "email",
  "company",
  "department",
  "position",
  "is_active",
  "deleted_at",
] as const satisfies readonly (UserSortField | "avatar")[]

const UserAvatar = ({ user }: { user: User }) => {
  const initial =
    Array.from(user.full_name?.trim() ?? "").at(0) ??
    Array.from(user.username.trim()).at(0)

  return (
    <Avatar
      aria-hidden="true"
      src={getUserPhotoUrl(user, "avatar")}
      sx={{ width: 32, height: 32, flexShrink: 0, fontSize: "0.875rem" }}
    >
      {initial?.toUpperCase()}
    </Avatar>
  )
}

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
}: UserActionsProps) => {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
      <Button
        component={Link}
        to={`/users/${String(user.id)}/edit`}
        size="small"
        variant="outlined"
      >
        {t("common.edit")}
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
          {t("common.restore")}
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
          {t("common.delete")}
        </Button>
      )}
    </Box>
  )
}

export const UsersPage = () => {
  const { t, i18n } = useTranslation()
  const [showDeleted, setShowDeleted] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const { sort, sortBy } = useListSort<UserSortField>("id", () => {
    setPage(1)
  })
  const {
    data: lastData,
    currentData,
    error,
    isFetching,
  } = useListUsersQuery({
    include_deleted: showDeleted,
    page,
    limit,
    ...sort,
  })
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation()
  const [restoreUser, { isLoading: isRestoring }] = useRestoreUserMutation()
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deleteError, setDeleteError] = useState(false)
  const [restoreError, setRestoreError] = useState(false)
  const data = error
    ? undefined
    : (currentData ?? (isFetching ? lastData : undefined))
  const users = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.pages ?? 0
  const isMobile = useMediaQuery(theme => theme.breakpoints.down("sm"))
  const sortLabels: Record<UserSortField, string> = {
    id: "ID",
    username: t("common.username"),
    full_name: t("common.fullName"),
    email: t("common.email"),
    company: t("common.company"),
    department: t("common.department"),
    position: t("common.position"),
    is_active: t("common.active"),
    deleted_at: t("users.deletedAt"),
    mobile_phone: t("userForm.mobilePhone"),
    ip_phone: t("userForm.ipPhone"),
    messenger: t("userForm.messenger"),
    auth_method: t("userForm.authMethod"),
    created_at: t("common.createdAt"),
    is_deleted: t("common.deleted"),
  }

  useEffect(() => {
    if (currentData && currentData.pages > 0 && page > currentData.pages) {
      setPage(currentData.pages)
    }
  }, [currentData, page])

  const handleShowDeletedChange = (checked: boolean) => {
    setShowDeleted(checked)
    setPage(1)
  }

  const openDeleteDialog = (user: User) => {
    setDeleteError(false)
    setUserToDelete(user)
  }

  const closeDeleteDialog = () => {
    setDeleteError(false)
    setUserToDelete(null)
  }

  const handleDelete = async () => {
    if (!userToDelete) {
      return
    }
    setDeleteError(false)
    try {
      await deleteUser(userToDelete.id).unwrap()
      setUserToDelete(null)
    } catch {
      setDeleteError(true)
    }
  }

  const handleRestore = async (user: User) => {
    setRestoreError(false)
    try {
      await restoreUser(user.id).unwrap()
    } catch {
      setRestoreError(true)
    }
  }

  return (
    <Box sx={{ p: 2 }}>
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
          {t("common.back")}
        </Button>
        {data && (
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
              label={t("users.showDeleted")}
            />
            <Button component={Link} to="/users/create" variant="contained">
              {t("common.create")}
            </Button>
          </Box>
        )}
      </Box>

      {data && isMobile && (
        <ListSortControls fields={sortLabels} sort={sort} onSort={sortBy} />
      )}
      <ListProgress isFetching={isFetching && data !== undefined} />

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {getApiErrorDetail("data" in error ? error.data : undefined) ??
            t("users.loadError")}
        </Typography>
      )}

      {restoreError && (
        <Typography color="error" sx={{ mb: 2 }}>
          {t("users.restoreError")}
        </Typography>
      )}

      {data && !isFetching && users.length === 0 && (
        <Typography color="text.secondary">{t("users.empty")}</Typography>
      )}

      {users.length > 0 && isMobile && (
        <>
          <Stack spacing={1} aria-busy={isFetching}>
            {users.map(user => (
              <Card key={user.id}>
                <CardContent>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{ alignItems: "center" }}
                  >
                    <UserAvatar user={user} />
                    <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                      <Typography variant="h6" component="div">
                        {user.full_name ?? user.username}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.username}
                      </Typography>
                    </Box>
                  </Stack>
                  <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                    <Chip
                      label={
                        user.is_active
                          ? t("common.active")
                          : t("common.inactive")
                      }
                      color={user.is_active ? "success" : "default"}
                      size="small"
                    />
                    {user.is_deleted && (
                      <Chip
                        label={t("common.deleted")}
                        color="error"
                        size="small"
                      />
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
                  {user.is_deleted && (
                    <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                      {t("users.deletedLabel")}{" "}
                      {user.deleted_at
                        ? new Date(user.deleted_at).toLocaleString(
                            i18n.language,
                          )
                        : "—"}
                    </Typography>
                  )}
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

      {!isMobile && users.length > 0 && (
        <TableContainer component={Paper}>
          <Table size="small" aria-busy={isFetching}>
            <TableHead>
              <TableRow>
                {tableFields.map(field =>
                  field === "avatar" ? (
                    <TableCell key={field} align="center">
                      {t("users.avatar")}
                    </TableCell>
                  ) : (
                    <SortableTableCell
                      key={field}
                      field={field}
                      label={sortLabels[field]}
                      sort={sort}
                      onSort={sortBy}
                    />
                  ),
                )}
                <TableCell>{t("common.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.id}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                      <UserAvatar user={user} />
                    </Box>
                  </TableCell>
                  <TableCell>{user.full_name ?? "—"}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email ?? "—"}</TableCell>
                  <TableCell>{user.company ?? "—"}</TableCell>
                  <TableCell>{user.department ?? "—"}</TableCell>
                  <TableCell>{user.position ?? "—"}</TableCell>
                  <TableCell>
                    {user.is_deleted
                      ? t("common.deleted")
                      : user.is_active
                        ? t("common.yes")
                        : t("common.no")}
                  </TableCell>
                  <TableCell>
                    {user.is_deleted && user.deleted_at
                      ? new Date(user.deleted_at).toLocaleString(i18n.language)
                      : "—"}
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
          labelRowsPerPage={t("common.rowsPerPage")}
          labelDisplayedRows={({ from, to, count }) =>
            t("common.displayedRows", { from, to, count })
          }
        />
      )}

      <Dialog open={userToDelete !== null} onClose={closeDeleteDialog}>
        <DialogTitle>{t("users.deleteDialogTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("users.deleteDialogBody", {
              username: userToDelete?.username ?? "",
            })}
          </DialogContentText>
          {deleteError && (
            <Typography color="error" sx={{ mt: 1 }}>
              {t("users.deleteError")}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>{t("common.cancel")}</Button>
          <Button
            color="error"
            variant="contained"
            disabled={isDeleting}
            onClick={() => {
              void handleDelete()
            }}
          >
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
