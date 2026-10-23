import { useEffect, useState } from "react"
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
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
import { Link } from "react-router-dom"
import { useAppDispatch } from "../../../app/hooks"
import {
  useDeleteLdapServerMutation,
  useListLdapServersQuery,
  useTestLdapServerMutation,
} from "../../../entities/ldap-server"
import type { LdapServer } from "../../../entities/ldap-server"
import { showNotification } from "../../../shared/notifications"
import { PageHeader } from "../../../shared/ui/page-header"

type LdapServerActionsProps = {
  server: LdapServer
  onDelete: (server: LdapServer) => void
  onTest: (server: LdapServer) => void
  isTesting: boolean
}

const LdapServerActions = ({
  server,
  onDelete,
  onTest,
  isTesting,
}: LdapServerActionsProps) => {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: "flex", gap: 1, width: "100%", flexWrap: "wrap" }}>
      <Button
        component={Link}
        to={`/ldap-servers/${String(server.id)}/edit`}
        size="small"
        variant="outlined"
      >
        {t("common.edit")}
      </Button>
      <Button
        size="small"
        variant="outlined"
        disabled={isTesting}
        onClick={() => {
          onTest(server)
        }}
      >
        {t("ldapServers.testConnection")}
      </Button>
      <Button
        size="small"
        variant="outlined"
        color="error"
        onClick={() => {
          onDelete(server)
        }}
      >
        {t("common.delete")}
      </Button>
    </Box>
  )
}

export const LdapServersPage = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const { data, error, isLoading } = useListLdapServersQuery({ page, limit })
  const [deleteServer, { isLoading: isDeleting }] =
    useDeleteLdapServerMutation()
  const [testServer, { isLoading: isTesting }] = useTestLdapServerMutation()
  const [serverToDelete, setServerToDelete] = useState<LdapServer | null>(null)
  const [deleteError, setDeleteError] = useState(false)
  const servers = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.pages ?? 0
  const isMobile = useMediaQuery(theme => theme.breakpoints.down("sm"))

  useEffect(() => {
    if (data && data.pages > 0 && page > data.pages) {
      setPage(data.pages)
    }
  }, [data, page])

  const openDeleteDialog = (server: LdapServer) => {
    setDeleteError(false)
    setServerToDelete(server)
  }

  const closeDeleteDialog = () => {
    setDeleteError(false)
    setServerToDelete(null)
  }

  const handleDelete = async () => {
    if (!serverToDelete) {
      return
    }
    setDeleteError(false)
    try {
      await deleteServer(serverToDelete.id).unwrap()
      setServerToDelete(null)
    } catch {
      setDeleteError(true)
    }
  }

  const handleTest = async (server: LdapServer) => {
    try {
      const result = await testServer(server.id).unwrap()
      dispatch(
        showNotification({
          message: result.success
            ? t("ldapServers.testSuccess")
            : t("ldapServers.testFailure"),
          severity: result.success ? "success" : "error",
        }),
      )
    } catch {
      dispatch(
        showNotification({
          message: t("ldapServers.testFailure"),
          severity: "error",
        }),
      )
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <PageHeader title={t("ldapServers.title")} />
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
        <Button component={Link} to="/ldap-servers/create" variant="contained">
          {t("common.create")}
        </Button>
      </Box>

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {t("ldapServers.loadError")}
        </Typography>
      )}

      {!isLoading && !error && servers.length === 0 && (
        <Typography color="text.secondary">{t("ldapServers.empty")}</Typography>
      )}

      {servers.length > 0 && isMobile && (
        <>
          <Stack spacing={1}>
            {servers.map(server => (
              <Card key={server.id}>
                <CardContent>
                  <Typography variant="h6" component="div">
                    {server.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {server.host}:{server.port}
                  </Typography>
                  <Box
                    sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}
                  >
                    <Chip
                      label={
                        server.is_active
                          ? t("common.active")
                          : t("common.inactive")
                      }
                      color={server.is_active ? "success" : "default"}
                      size="small"
                    />
                    {server.use_ssl && (
                      <Chip label={t("ldapServers.ssl")} size="small" />
                    )}
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {t("ldapServers.priority")}: {server.priority}
                  </Typography>
                </CardContent>
                <CardActions>
                  <LdapServerActions
                    server={server}
                    onDelete={openDeleteDialog}
                    onTest={server => {
                      void handleTest(server)
                    }}
                    isTesting={isTesting}
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

      {servers.length > 0 && !isMobile && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>{t("ldapServers.name")}</TableCell>
                <TableCell>{t("ldapServers.host")}</TableCell>
                <TableCell>{t("ldapServers.port")}</TableCell>
                <TableCell>{t("ldapServers.ssl")}</TableCell>
                <TableCell>{t("ldapServers.priority")}</TableCell>
                <TableCell>{t("common.active")}</TableCell>
                <TableCell>{t("common.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {servers.map(server => (
                <TableRow key={server.id} hover>
                  <TableCell>{server.id}</TableCell>
                  <TableCell>{server.name}</TableCell>
                  <TableCell>{server.host}</TableCell>
                  <TableCell>{server.port}</TableCell>
                  <TableCell>
                    {server.use_ssl ? t("common.yes") : t("common.no")}
                  </TableCell>
                  <TableCell>{server.priority}</TableCell>
                  <TableCell>
                    {server.is_active ? t("common.yes") : t("common.no")}
                  </TableCell>
                  <TableCell>
                    <LdapServerActions
                      server={server}
                      onDelete={openDeleteDialog}
                      onTest={server => {
                        void handleTest(server)
                      }}
                      isTesting={isTesting}
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

      <Dialog open={serverToDelete !== null} onClose={closeDeleteDialog}>
        <DialogTitle>{t("ldapServers.deleteDialogTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("ldapServers.deleteDialogBody", {
              name: serverToDelete?.name ?? "",
            })}
          </DialogContentText>
          {deleteError && (
            <Typography color="error" sx={{ mt: 1 }}>
              {t("ldapServers.deleteError")}
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
