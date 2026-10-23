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
  useCreateUserMutation,
  useGetUserQuery,
  useUpdateUserMutation,
} from "../../../entities/user"
import type { UserCreate, UserUpdate } from "../../../entities/user"
import { PageHeader } from "../../../shared/ui/page-header"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const buildUserFormSchema = (t: TFunction) =>
  z.object({
    username: z.string().min(1, t("userForm.usernameRequired")),
    password: z.string(),
    email: z.string().refine(value => value === "" || EMAIL_REGEX.test(value), {
      message: t("userForm.invalidEmail"),
    }),
    full_name: z.string(),
    mobile_phone: z.string(),
    ip_phone: z.string(),
    messenger: z.string(),
    company: z.string(),
    department: z.string(),
    position: z.string(),
    auth_method: z.string(),
    is_active: z.boolean(),
  })

type UserFormValues = z.infer<ReturnType<typeof buildUserFormSchema>>

const defaultValues: UserFormValues = {
  username: "",
  password: "",
  email: "",
  full_name: "",
  mobile_phone: "",
  ip_phone: "",
  messenger: "",
  company: "",
  department: "",
  position: "",
  auth_method: "",
  is_active: true,
}

const toNullable = (value?: string | null) =>
  value?.trim() ? value.trim() : null

export const UserFormPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = id !== undefined
  const userId = isEdit ? Number(id) : undefined

  const { data: user, isLoading } = useGetUserQuery(userId ?? skipToken)
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation()
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation()
  const [submitError, setSubmitError] = useState(false)

  const schema = useMemo(() => buildUserFormSchema(t), [t])

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  useEffect(() => {
    if (user) {
      reset({
        username: user.username,
        password: "",
        email: user.email ?? "",
        full_name: user.full_name ?? "",
        mobile_phone: user.mobile_phone ?? "",
        ip_phone: user.ip_phone ?? "",
        messenger: user.messenger ?? "",
        company: user.company ?? "",
        department: user.department ?? "",
        position: user.position ?? "",
        auth_method: user.auth_method,
        is_active: user.is_active,
      })
    }
  }, [user, reset])

  const onSubmit = async (values: UserFormValues) => {
    setSubmitError(false)
    try {
      if (isEdit && userId !== undefined) {
        const data: UserUpdate = {
          username: values.username.trim(),
          password: toNullable(values.password),
          email: toNullable(values.email),
          full_name: toNullable(values.full_name),
          mobile_phone: toNullable(values.mobile_phone),
          ip_phone: toNullable(values.ip_phone),
          messenger: toNullable(values.messenger),
          company: toNullable(values.company),
          department: toNullable(values.department),
          position: toNullable(values.position),
          auth_method: values.auth_method.trim() || undefined,
          is_active: values.is_active,
        }
        await updateUser({ id: userId, data }).unwrap()
      } else {
        const data: UserCreate = {
          username: values.username.trim(),
          password: toNullable(values.password),
          email: toNullable(values.email),
          full_name: toNullable(values.full_name),
          mobile_phone: toNullable(values.mobile_phone),
          ip_phone: toNullable(values.ip_phone),
          messenger: toNullable(values.messenger),
          company: toNullable(values.company),
          department: toNullable(values.department),
          position: toNullable(values.position),
          auth_method: values.auth_method.trim() || undefined,
          is_active: values.is_active,
        }
        await createUser(data).unwrap()
      }
      await navigate("/users")
    } catch {
      setSubmitError(true)
    }
  }

  const handleFormSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    void handleSubmit(onSubmit)(event)
  }

  const title = isEdit ? t("userForm.editTitle") : t("userForm.createTitle")
  const isSubmitting = isCreating || isUpdating
  const isLdap = isEdit && user?.auth_method !== "local"

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
          label={t("common.username")}
          {...register("username")}
          error={!!errors.username}
          helperText={errors.username?.message}
          required
        />
        <TextField
          label={t("common.password")}
          type="password"
          {...register("password")}
          disabled={isLdap}
          helperText={
            isLdap
              ? t("userForm.passwordFromAd")
              : isEdit
                ? t("userForm.passwordKeepEmpty")
                : undefined
          }
        />
        <TextField label={t("common.fullName")} {...register("full_name")} />
        <TextField
          label={t("common.email")}
          type="email"
          {...register("email")}
          error={!!errors.email}
          helperText={errors.email?.message}
        />
        <TextField
          label={t("userForm.mobilePhone")}
          {...register("mobile_phone")}
        />
        <TextField label={t("userForm.ipPhone")} {...register("ip_phone")} />
        <TextField label={t("userForm.messenger")} {...register("messenger")} />
        <TextField label={t("common.company")} {...register("company")} />
        <TextField label={t("common.department")} {...register("department")} />
        <TextField label={t("common.position")} {...register("position")} />
        <TextField
          label={t("userForm.authMethod")}
          {...register("auth_method")}
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

        {submitError && (
          <Typography color="error" sx={{ gridColumn: "1 / -1" }}>
            {t("userForm.saveError")}
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 2, gridColumn: "1 / -1" }}>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {t("common.save")}
          </Button>
          <Button component={Link} to="/users" variant="outlined">
            {t("common.back")}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
