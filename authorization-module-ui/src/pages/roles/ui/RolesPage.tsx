import { useEffect, useState } from "react"
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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
import {
  useDeleteRoleMutation,
  useListRolesQuery,
} from "../../../entities/role"
import type { Role } from "../../../entities/role"
import { PageHeader } from "../../../shared/ui/page-header"

type RoleActionsProps = {
  role: Role
  onDelete: (role: Role) => void
}

const RoleActions = ({ role, onDelete }: RoleActionsProps) => {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
      <Button
        component={Link}
        to={`/roles/${String(role.id)}/edit`}
        size="small"
        variant="outlined"
      >
        {t("common.edit")}
      </Button>
      <Button
        size="small"
        variant="outlined"
        color="error"
        onClick={() => {
          onDelete(role)
        }}
      >
        {t("common.delete")}
      </Button>
    </Box>
  )
}

export const RolesPage = () => {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const { data, error, isLoading } = useListRolesQuery({ page, limit })
  const [deleteRole, { isLoading: isDeleting }] = useDeleteRoleMutation()
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const [deleteError, setDeleteError] = useState(false)
  const roles = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.pages ?? 0
  const isMobile = useMediaQuery(theme => theme.breakpoints.down("sm"))

  useEffect(() => {
    if (data && data.pages > 0 && page > data.pages) {
      setPage(data.pages)
    }
  }, [data, page])

  const openDeleteDialog = (role: Role) => {
    setDeleteError(false)
    setRoleToDelete(role)
  }

  const closeDeleteDialog = () => {
    setDeleteError(false)
    setRoleToDelete(null)
  }

  const handleDelete = async () => {
    if (!roleToDelete) {
      return
    }
    setDeleteError(false)
    try {
      await deleteRole(roleToDelete.id).unwrap()
      setRoleToDelete(null)
    } catch {
      setDeleteError(true)
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <PageHeader title={t("roles.title")} />
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
        <Button component={Link} to="/roles/create" variant="contained">
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
          {t("roles.loadError")}
        </Typography>
      )}

      {!isLoading && !error && roles.length === 0 && (
        <Typography color="text.secondary">{t("roles.empty")}</Typography>
      )}

      {roles.length > 0 && isMobile && (
        <>
          <Stack spacing={1}>
            {roles.map(role => (
              <Card key={role.id}>
                <CardContent>
                  <Typography variant="h6" component="div">
                    {role.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {role.description ?? "—"}
                  </Typography>
                </CardContent>
                <CardActions>
                  <RoleActions role={role} onDelete={openDeleteDialog} />
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

      {roles.length > 0 && !isMobile && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>{t("roles.name")}</TableCell>
                <TableCell>{t("roles.description")}</TableCell>
                <TableCell>{t("common.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map(role => (
                <TableRow key={role.id} hover>
                  <TableCell>{role.id}</TableCell>
                  <TableCell>{role.name}</TableCell>
                  <TableCell>{role.description ?? "—"}</TableCell>
                  <TableCell>
                    <RoleActions role={role} onDelete={openDeleteDialog} />
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

      <Dialog open={roleToDelete !== null} onClose={closeDeleteDialog}>
        <DialogTitle>{t("roles.deleteDialogTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("roles.deleteDialogBody", { name: roleToDelete?.name ?? "" })}
          </DialogContentText>
          {deleteError && (
            <Typography color="error" sx={{ mt: 1 }}>
              {t("roles.deleteError")}
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
