import { useEffect, useState } from "react"
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
import { z } from "zod"
import {
  useCreateUserMutation,
  useGetUserQuery,
  useUpdateUserMutation,
} from "../../../entities/user"
import type { UserCreate, UserUpdate } from "../../../entities/user"
import { PageHeader } from "../../../shared/ui/page-header"

const userFormSchema = z.object({
  username: z.string().min(1, "Введите логин"),
  password: z.string(),
  email: z
    .string()
    .refine(value => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: "Некорректный email",
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

type UserFormValues = z.infer<typeof userFormSchema>

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
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = id !== undefined
  const userId = isEdit ? Number(id) : undefined

  const { data: user, isLoading } = useGetUserQuery(userId ?? skipToken)
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation()
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
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
    setSubmitError(null)
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
      setSubmitError("Не удалось сохранить пользователя")
    }
  }

  const handleFormSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    void handleSubmit(onSubmit)(event)
  }

  const title = isEdit ? "Редактирование пользователя" : "Создание пользователя"
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
        }}
      >
        <TextField
          label="Логин"
          {...register("username")}
          error={!!errors.username}
          helperText={errors.username?.message}
          required
        />
        <TextField
          label="Пароль"
          type="password"
          {...register("password")}
          disabled={isLdap}
          helperText={
            isLdap
              ? "Пароль берётся из AD"
              : isEdit
                ? "Оставьте пустым, чтобы не менять пароль"
                : undefined
          }
        />
        <TextField label="ФИО" {...register("full_name")} />
        <TextField
          label="Email"
          type="email"
          {...register("email")}
          error={!!errors.email}
          helperText={errors.email?.message}
        />
        <TextField label="Мобильный телефон" {...register("mobile_phone")} />
        <TextField label="IP-телефон" {...register("ip_phone")} />
        <TextField label="Мессенджер" {...register("messenger")} />
        <TextField label="Компания" {...register("company")} />
        <TextField label="Отдел" {...register("department")} />
        <TextField label="Должность" {...register("position")} />
        <TextField label="Метод авторизации" {...register("auth_method")} />
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
              label="Активен"
            />
          )}
        />

        {submitError && (
          <Typography color="error" sx={{ gridColumn: "1 / -1" }}>
            {submitError}
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 2, gridColumn: "1 / -1" }}>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            Сохранить
          </Button>
          <Button component={Link} to="/users" variant="outlined">
            Назад
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
