import { useEffect, useMemo, useState } from "react"
import type { SubmitEvent } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from "@mui/material"
import { skipToken } from "@reduxjs/toolkit/query"
import { Controller, useForm } from "react-hook-form"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { z } from "zod"
import type { TFunction } from "i18next"
import {
  useCreateLdapServerMutation,
  useGetLdapServerQuery,
  useUpdateLdapServerMutation,
} from "../../../entities/ldap-server"
import type {
  LdapServerCreate,
  LdapServerUpdate,
} from "../../../entities/ldap-server"
import { PageHeader } from "../../../shared/ui/page-header"

const buildLdapServerSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(1, t("ldapServerForm.nameRequired")),
    host: z.string().min(1, t("ldapServerForm.hostRequired")),
    port: z
      .number()
      .refine(
        value => Number.isInteger(value) && value >= 1 && value <= 65535,
        { message: t("ldapServerForm.portInvalid") },
      ),
    domain: z.string(),
    base_dn: z.string(),
    use_ssl: z.boolean(),
    bind_username: z.string(),
    bind_password: z.string(),
    search_filter: z.string(),
    is_active: z.boolean(),
    priority: z
      .number()
      .refine(value => Number.isInteger(value) && value >= 1, {
        message: t("ldapServerForm.priorityInvalid"),
      }),
    auto_login_enabled: z.boolean(),
  })

type LdapServerFormValues = z.infer<ReturnType<typeof buildLdapServerSchema>>

const defaultValues: LdapServerFormValues = {
  name: "",
  host: "",
  port: 389,
  domain: "",
  base_dn: "",
  use_ssl: false,
  bind_username: "",
  bind_password: "",
  search_filter: "(objectClass=person)",
  is_active: true,
  priority: 1,
  auto_login_enabled: true,
}

const toNullable = (value?: string | null) =>
  value?.trim() ? value.trim() : null

export const LdapServerFormPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = id !== undefined
  const serverId = isEdit ? Number(id) : undefined

  const { data: server, isLoading } = useGetLdapServerQuery(
    serverId ?? skipToken,
  )
  const [createServer, { isLoading: isCreating }] =
    useCreateLdapServerMutation()
  const [updateServer, { isLoading: isUpdating }] =
    useUpdateLdapServerMutation()
  const [submitError, setSubmitError] = useState(false)

  const schema = useMemo(() => buildLdapServerSchema(t), [t])

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LdapServerFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  useEffect(() => {
    if (server) {
      reset({
        name: server.name,
        host: server.host,
        port: server.port,
        domain: server.domain ?? "",
        base_dn: server.base_dn ?? "",
        use_ssl: server.use_ssl,
        bind_username: server.bind_username ?? "",
        bind_password: "",
        search_filter: server.search_filter,
        is_active: server.is_active,
        priority: server.priority,
        auto_login_enabled: server.auto_login_enabled,
      })
    }
  }, [server, reset])

  const onSubmit = async (values: LdapServerFormValues) => {
    setSubmitError(false)
    const data: LdapServerCreate = {
      name: values.name.trim(),
      host: values.host.trim(),
      port: values.port,
      domain: toNullable(values.domain),
      base_dn: toNullable(values.base_dn),
      use_ssl: values.use_ssl,
      bind_username: toNullable(values.bind_username),
      bind_password: toNullable(values.bind_password),
      search_filter: values.search_filter.trim() || "(objectClass=person)",
      is_active: values.is_active,
      priority: values.priority,
      auto_login_enabled: values.auto_login_enabled,
    }
    try {
      if (isEdit && serverId !== undefined) {
        const update: LdapServerUpdate = { ...data }
        await updateServer({ id: serverId, data: update }).unwrap()
      } else {
        await createServer(data).unwrap()
      }
      await navigate("/ldap-servers")
    } catch {
      setSubmitError(true)
    }
  }

  const handleFormSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    void handleSubmit(onSubmit)(event)
  }

  const title = isEdit
    ? t("ldapServers.editTitle")
    : t("ldapServers.createTitle")
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
          label={t("ldapServers.name")}
          {...register("name")}
          error={!!errors.name}
          helperText={errors.name?.message}
          required
        />
        <TextField
          label={t("ldapServers.host")}
          {...register("host")}
          error={!!errors.host}
          helperText={errors.host?.message}
          required
        />
        <TextField
          label={t("ldapServers.port")}
          type="number"
          {...register("port", { valueAsNumber: true })}
          error={!!errors.port}
          helperText={errors.port?.message}
        />
        <TextField label={t("ldapServerForm.domain")} {...register("domain")} />
        <TextField
          label={t("ldapServerForm.baseDn")}
          {...register("base_dn")}
        />
        <TextField
          label={t("ldapServerForm.bindUsername")}
          {...register("bind_username")}
        />
        <TextField
          label={t("ldapServerForm.bindPassword")}
          type="password"
          {...register("bind_password")}
          helperText={
            isEdit ? t("ldapServerForm.passwordKeepEmpty") : undefined
          }
        />
        <TextField
          label={t("ldapServerForm.searchFilter")}
          {...register("search_filter")}
        />
        <TextField
          label={t("ldapServers.priority")}
          type="number"
          {...register("priority", { valueAsNumber: true })}
          error={!!errors.priority}
          helperText={errors.priority?.message}
        />
        <Controller
          name="use_ssl"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={event => {
                    field.onChange(event.target.checked)
                  }}
                />
              }
              label={t("ldapServerForm.useSsl")}
            />
          )}
        />
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={event => {
                    field.onChange(event.target.checked)
                  }}
                />
              }
              label={t("common.active")}
            />
          )}
        />
        <Controller
          name="auto_login_enabled"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={event => {
                    field.onChange(event.target.checked)
                  }}
                />
              }
              label={t("ldapServerForm.autoLogin")}
            />
          )}
        />

        {submitError && (
          <Typography color="error" sx={{ gridColumn: "1 / -1" }}>
            {t("ldapServerForm.saveError")}
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 2, gridColumn: "1 / -1" }}>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {t("common.save")}
          </Button>
          <Button component={Link} to="/ldap-servers" variant="outlined">
            {t("common.back")}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
