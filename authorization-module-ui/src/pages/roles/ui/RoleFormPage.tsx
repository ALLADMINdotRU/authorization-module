import { useEffect, useMemo, useState } from "react"
import type { SubmitEvent } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material"
import { skipToken } from "@reduxjs/toolkit/query"
import { useForm } from "react-hook-form"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { z } from "zod"
import type { TFunction } from "i18next"
import {
  useCreateRoleMutation,
  useGetRoleQuery,
  useUpdateRoleMutation,
} from "../../../entities/role"
import type { RoleCreate, RoleUpdate } from "../../../entities/role"
import { PageHeader } from "../../../shared/ui/page-header"

const buildRoleSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(1, t("roleForm.nameRequired")),
    description: z.string(),
  })

type RoleFormValues = z.infer<ReturnType<typeof buildRoleSchema>>

const defaultValues: RoleFormValues = {
  name: "",
  description: "",
}

const toNullable = (value?: string | null) =>
  value?.trim() ? value.trim() : null

export const RoleFormPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = id !== undefined
  const roleId = isEdit ? Number(id) : undefined

  const { data: role, isLoading } = useGetRoleQuery(roleId ?? skipToken)
  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation()
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation()
  const [submitError, setSubmitError] = useState(false)

  const schema = useMemo(() => buildRoleSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  useEffect(() => {
    if (role) {
      reset({
        name: role.name,
        description: role.description ?? "",
      })
    }
  }, [role, reset])

  const onSubmit = async (values: RoleFormValues) => {
    setSubmitError(false)
    const data: RoleCreate = {
      name: values.name.trim(),
      description: toNullable(values.description),
    }
    try {
      if (isEdit && roleId !== undefined) {
        const update: RoleUpdate = { ...data }
        await updateRole({ id: roleId, data: update }).unwrap()
      } else {
        await createRole(data).unwrap()
      }
      await navigate("/roles")
    } catch {
      setSubmitError(true)
    }
  }

  const handleFormSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    void handleSubmit(onSubmit)(event)
  }

  const title = isEdit ? t("roles.editTitle") : t("roles.createTitle")
  const isSubmitting = isCreating || isUpdating

  if (isEdit && isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2 }}>
      <PageHeader title={title} />
      <Box
        component="form"
        onSubmit={handleFormSubmit}
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
          gap: 2,
          maxWidth: 900,
          mx: "auto",
        }}
      >
        <TextField
          label={t("roles.name")}
          {...register("name")}
          error={!!errors.name}
          helperText={errors.name?.message}
          required
        />
        <TextField
          label={t("roles.description")}
          {...register("description")}
          multiline
          minRows={2}
          sx={{ gridColumn: "1 / -1" }}
        />

        {submitError && (
          <Typography color="error" sx={{ gridColumn: "1 / -1" }}>
            {t("roleForm.saveError")}
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 2, gridColumn: "1 / -1" }}>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {t("common.save")}
          </Button>
          <Button component={Link} to="/roles" variant="outlined">
            {t("common.back")}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
