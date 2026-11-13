import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined"
import ContactMailOutlinedIcon from "@mui/icons-material/ContactMailOutlined"
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { getUserPhotoUrl, type UserProfile } from "../../../entities/user"
import { useMeQuery } from "../../../features/auth"
import { PageHeader } from "../../../shared/ui/page-header"

type ProfileField = readonly [label: string, value: string | number | null]

const ProfileFields = ({ fields }: { fields: readonly ProfileField[] }) => (
  <>
    {fields.map(([label, value]) => {
      const text = String(value ?? "").trim()

      return (
        <Box key={label} sx={{ minWidth: 0 }}>
          <Typography component="dt" variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography
            component="dd"
            color={text ? "text.primary" : "text.secondary"}
            sx={{ m: 0, overflowWrap: "anywhere" }}
          >
            {text || "—"}
          </Typography>
        </Box>
      )
    })}
  </>
)

type ProfileSectionProps = {
  title: string
  icon: ReactNode
  fields: readonly ProfileField[]
}

const ProfileSection = ({ title, icon, fields }: ProfileSectionProps) => (
  <Card component="section" variant="outlined" sx={{ borderRadius: 3 }}>
    <CardHeader
      avatar={
        <Avatar
          aria-hidden="true"
          variant="rounded"
          sx={theme => ({
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            color: "primary.dark",
          })}
        >
          {icon}
        </Avatar>
      }
      title={title}
      slotProps={{
        title: {
          component: "h2",
          variant: "subtitle1",
          sx: { fontWeight: 700 },
        },
      }}
      sx={{ px: { xs: 2, sm: 3 } }}
    />
    <Divider />
    <CardContent
      component="dl"
      sx={{
        m: 0,
        py: 0,
        px: { xs: 2, sm: 3 },
        "&:last-child": { pb: 0 },
        "& > div": {
          display: "grid",
          gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)",
          alignItems: "baseline",
          columnGap: 2,
          py: 1.25,
          "& + div": { borderTop: 1, borderColor: "divider" },
        },
      }}
    >
      <ProfileFields fields={fields} />
    </CardContent>
  </Card>
)

const ProfileDetails = ({ user }: { user: UserProfile }) => {
  const { t, i18n } = useTranslation()
  const fullName = user.full_name?.trim() ?? ""
  const displayName = fullName || user.username
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => Array.from(word)[0])
    .join("")
    .toLocaleUpperCase(i18n.language)
  const status = t(user.is_active ? "common.active" : "common.inactive")
  const createdAt = new Date(user.created_at)
  const authMethod =
    user.auth_method === "local"
      ? t("profile.localAuth")
      : user.auth_method === "ldap"
        ? "LDAP"
        : user.auth_method

  return (
    <Stack spacing={2}>
      <Card component="section" variant="outlined" sx={{ borderRadius: 3 }}>
        <CardHeader
          avatar={
            <Avatar
              aria-hidden="true"
              src={getUserPhotoUrl(user)}
              sx={{
                width: { xs: 52, sm: 64 },
                height: { xs: 52, sm: 64 },
                bgcolor: "primary.main",
                color: "primary.contrastText",
                fontWeight: 700,
                fontSize: { xs: "1.25rem", sm: "1.5rem" },
              }}
            >
              {initials}
            </Avatar>
          }
          title={
            <Typography
              component="h2"
              variant="h5"
              sx={{ fontWeight: 700, overflowWrap: "anywhere" }}
            >
              {displayName}
            </Typography>
          }
          subheader={
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                mt: 0.75,
                alignItems: "center",
                flexWrap: "wrap",
                minWidth: 0,
              }}
            >
              {fullName && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ overflowWrap: "anywhere", minWidth: 0 }}
                >
                  {user.username}
                </Typography>
              )}
              <Chip
                aria-label={`${t("profile.status")} - ${status}`}
                label={status}
                size="small"
                variant="outlined"
                color={user.is_active ? "success" : "default"}
              />
            </Stack>
          }
          disableTypography
          slotProps={{ content: { sx: { minWidth: 0 } } }}
          sx={theme => ({
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 3 },
            bgcolor: alpha(theme.palette.primary.main, 0.05),
          })}
        />
        <Divider />
        <CardContent
          component="dl"
          sx={{
            display: "grid",
            gridTemplateColumns: { sm: "repeat(3, minmax(0, 1fr))" },
            gap: 2,
            m: 0,
            px: { xs: 2, sm: 3 },
            py: 2,
            "&:last-child": { pb: 2 },
          }}
        >
          <ProfileFields
            fields={[
              ["ID", user.id],
              [t("userForm.authMethod"), authMethod],
              [
                t("common.createdAt"),
                Number.isNaN(createdAt.getTime())
                  ? user.created_at
                  : createdAt.toLocaleString(i18n.language),
              ],
            ]}
          />
        </CardContent>
      </Card>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { md: "repeat(2, minmax(0, 1fr))" },
          alignItems: "start",
        }}
      >
        <ProfileSection
          title={t("profile.contacts")}
          icon={<ContactMailOutlinedIcon fontSize="small" />}
          fields={[
            [t("common.email"), user.email],
            [t("userForm.mobilePhone"), user.mobile_phone],
            [t("userForm.ipPhone"), user.ip_phone],
            [t("userForm.messenger"), user.messenger],
          ]}
        />
        <ProfileSection
          title={t("profile.work")}
          icon={<BusinessOutlinedIcon fontSize="small" />}
          fields={[
            [t("common.company"), user.company],
            [t("common.department"), user.department],
            [t("common.position"), user.position],
          ]}
        />
      </Box>
    </Stack>
  )
}

export const ProfilePage = () => {
  const { t } = useTranslation()
  const {
    data: user,
    isFetching,
    isError,
  } = useMeQuery(undefined, {
    refetchOnMountOrArgChange: true,
  })

  return (
    <Box
      component="main"
      sx={{ mx: "auto", maxWidth: 960, p: { xs: 2, sm: 3 } }}
    >
      <Button
        component={Link}
        to="/main"
        startIcon={<ArrowBackIcon />}
        size="small"
        sx={{ mb: 1 }}
      >
        {t("common.back")}
      </Button>
      <PageHeader title={t("navigation.profile")} />

      {isFetching && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress aria-label={t("common.loading")} />
        </Box>
      )}
      {isError && <Alert severity="error">{t("profile.loadError")}</Alert>}
      {user && !isFetching && !isError && <ProfileDetails user={user} />}
    </Box>
  )
}
