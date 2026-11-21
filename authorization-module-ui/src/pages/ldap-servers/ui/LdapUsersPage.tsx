import { useEffect, useState } from "react"
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
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
import { useTranslation } from "react-i18next"
import { Link, Navigate, useParams } from "react-router-dom"
import {
  useImportLdapUserMutation,
  useListLdapUsersQuery,
} from "../../../entities/ldap-server"
import type { LdapUser } from "../../../entities/ldap-server"
import { getApiErrorDetail } from "../../../shared/api/baseApi"
import { ListProgress } from "../../../shared/ui/list-sort"

const getStatus = ({ in_db, is_active }: LdapUser) => {
  if (!in_db) return "notImported"
  return is_active ? "active" : "blocked"
}

const statuses = {
  notImported: {
    label: "ldapUsers.notImported",
    color: "default",
    action: "ldapUsers.add",
    actionColor: "success",
  },
  active: {
    label: "common.active",
    color: "success",
    action: "ldapUsers.block",
    actionColor: "error",
  },
  blocked: {
    label: "ldapUsers.blocked",
    color: "error",
    action: "ldapUsers.unblock",
    actionColor: "success",
  },
} as const

const LdapUserAvatar = ({ user }: { user: LdapUser }) => {
  const initial =
    Array.from(user.full_name?.trim() ?? "").at(0) ??
    Array.from(user.username.trim()).at(0)

  return (
    <Avatar
      aria-hidden="true"
      src={
        user.thumbnail ? `data:image/jpeg;base64,${user.thumbnail}` : undefined
      }
      sx={{ width: 32, height: 32, fontSize: "0.875rem" }}
    >
      {initial?.toUpperCase()}
    </Avatar>
  )
}

const LdapUserStatus = ({ user }: { user: LdapUser }) => {
  const { t } = useTranslation()
  const status = statuses[getStatus(user)]

  return <Chip label={t(status.label)} color={status.color} size="small" />
}

type LdapUserActionProps = {
  user: LdapUser
  disabled: boolean
  onAction: (user: LdapUser) => void
}

const LdapUserAction = ({ user, disabled, onAction }: LdapUserActionProps) => {
  const { t } = useTranslation()
  const status = statuses[getStatus(user)]

  return (
    <Button
      color={status.actionColor}
      disabled={disabled}
      onClick={() => {
        onAction(user)
      }}
      size="small"
      variant="outlined"
    >
      {t(status.action)}
    </Button>
  )
}

const LdapUsersList = ({ serverId }: { serverId: number }) => {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const {
    data: lastData,
    currentData,
    error,
    isFetching,
  } = useListLdapUsersQuery(
    { serverId, page, limit },
    { refetchOnMountOrArgChange: true },
  )
  const [importUser, { error: actionError, isLoading: isUpdating, reset }] =
    useImportLdapUserMutation()
  const isMobile = useMediaQuery(theme => theme.breakpoints.down("sm"))
  const data = error
    ? undefined
    : (currentData ?? (isFetching ? lastData : undefined))
  const users = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.pages ?? 0
  const displayedPage = Math.min(page, Math.max(totalPages, 1))
  const isBusy = isFetching || isUpdating

  useEffect(() => {
    if (currentData && currentData.pages > 0 && page > currentData.pages) {
      setPage(currentData.pages)
    }
  }, [currentData, page])

  const changePage = (nextPage: number) => {
    reset()
    setPage(nextPage)
  }

  const handleAction = (user: LdapUser) => {
    void importUser({
      serverId,
      username: user.username,
      is_active: getStatus(user) !== "active",
    })
  }

  return (
    <Box sx={{ p: 2 }}>
      <Button
        component={Link}
        to="/ldap-servers"
        variant="outlined"
        sx={{ mb: 2 }}
      >
        {t("common.back")}
      </Button>

      <ListProgress isFetching={isFetching && data !== undefined} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getApiErrorDetail("data" in error ? error.data : undefined) ??
            t("ldapUsers.loadError")}
        </Alert>
      )}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getApiErrorDetail(
            "data" in actionError ? actionError.data : undefined,
          ) ?? t("ldapUsers.actionError")}
        </Alert>
      )}
      {data && !isFetching && users.length === 0 && (
        <Typography color="text.secondary">{t("ldapUsers.empty")}</Typography>
      )}

      {isMobile && users.length > 0 && (
        <Stack spacing={1} aria-busy={isBusy}>
          {users.map(user => (
            <Card key={user.username}>
              <CardContent>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: "center" }}
                >
                  <LdapUserAvatar user={user} />
                  <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                    <Typography>{user.full_name ?? user.username}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.full_name ? user.username : null}
                      {user.full_name && user.email ? " · " : null}
                      {user.email}
                    </Typography>
                  </Box>
                </Stack>
                <Box sx={{ mt: 1 }}>
                  <LdapUserStatus user={user} />
                </Box>
              </CardContent>
              <CardActions>
                <LdapUserAction
                  user={user}
                  disabled={isBusy}
                  onAction={handleAction}
                />
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}

      {!isMobile && users.length > 0 && (
        <TableContainer component={Paper}>
          <Table size="small" aria-busy={isBusy}>
            <TableHead>
              <TableRow>
                <TableCell>{t("users.avatar")}</TableCell>
                <TableCell>{t("common.username")}</TableCell>
                <TableCell>{t("common.fullName")}</TableCell>
                <TableCell>{t("common.email")}</TableCell>
                <TableCell>{t("profile.status")}</TableCell>
                <TableCell>{t("common.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.username} hover>
                  <TableCell>
                    <LdapUserAvatar user={user} />
                  </TableCell>
                  <TableCell component="th" scope="row">
                    {user.username}
                  </TableCell>
                  <TableCell>{user.full_name ?? "—"}</TableCell>
                  <TableCell>{user.email ?? "—"}</TableCell>
                  <TableCell>
                    <LdapUserStatus user={user} />
                  </TableCell>
                  <TableCell>
                    <LdapUserAction
                      user={user}
                      disabled={isBusy}
                      onAction={handleAction}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {isMobile && totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Pagination
            count={totalPages}
            page={displayedPage}
            onChange={(_event, nextPage) => {
              changePage(nextPage)
            }}
            disabled={isBusy}
            color="primary"
          />
        </Box>
      )}
      {!isMobile && total > 0 && (
        <TablePagination
          component="div"
          count={total}
          page={displayedPage - 1}
          rowsPerPage={limit}
          rowsPerPageOptions={[10, 20, 50]}
          onPageChange={(_event, nextPage) => {
            changePage(nextPage + 1)
          }}
          onRowsPerPageChange={event => {
            setLimit(Number(event.target.value))
            changePage(1)
          }}
          labelRowsPerPage={t("common.rowsPerPage")}
          labelDisplayedRows={({ from, to, count }) =>
            t("common.displayedRows", { from, to, count })
          }
          disabled={isBusy}
        />
      )}
    </Box>
  )
}

export const LdapUsersPage = () => {
  const { id } = useParams()
  const serverId = Number(id)

  if (
    !id ||
    !/^\d+$/.test(id) ||
    !Number.isSafeInteger(serverId) ||
    serverId < 1
  ) {
    return <Navigate to="/ldap-servers" replace />
  }

  return <LdapUsersList key={serverId} serverId={serverId} />
}
