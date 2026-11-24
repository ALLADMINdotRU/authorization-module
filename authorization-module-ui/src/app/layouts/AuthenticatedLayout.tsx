import { useId, useState } from "react"
import CloseIcon from "@mui/icons-material/Close"
import MenuIcon from "@mui/icons-material/Menu"
import { Box, Drawer, IconButton } from "@mui/material"
import type { Theme } from "@mui/material/styles"
import type { ParseKeys } from "i18next"
import { useTranslation } from "react-i18next"
import { Outlet, useMatches, useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../hooks"
import {
  clearUser,
  selectUser,
  useLogoutMutation,
  useMeQuery,
} from "../../features/auth"
import { PageHeader } from "../../shared/ui/page-header"
import { SideNavigation } from "./SideNavigation"
import { UserMenu } from "./UserMenu"

const navigationSurface = (theme: Theme) => ({
  backgroundColor: "#edf2fc",
  ...theme.applyStyles("dark", { backgroundColor: "#1b2434" }),
})

const useLayoutPreference = (key: string, defaultValue: boolean) => {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved === null ? defaultValue : saved === "true"
    } catch {
      return defaultValue
    }
  })

  const toggle = () => {
    const next = !value
    setValue(next)
    try {
      localStorage.setItem(key, String(next))
    } catch {
      // The layout can still change when browser storage is unavailable.
    }
  }

  return [value, toggle] as const
}

export type PageRouteHandle = {
  titleKey: ParseKeys
}

export const AuthenticatedLayout = () => {
  const { t } = useTranslation()
  const [isFullWidth, toggleFullWidth] = useLayoutPreference(
    "auth_full_width",
    true,
  )
  const [isMenuPinned, toggleMenuPinned] = useLayoutPreference(
    "auth_menu_pinned",
    true,
  )
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const drawerId = useId()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const storedUser = useAppSelector(selectUser)
  const { data: profile } = useMeQuery(undefined, { skip: !storedUser })
  const user = profile ?? storedUser
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation()
  const matches = useMatches()
  const page = matches.at(-1)?.handle as PageRouteHandle | undefined

  const closeDrawer = () => {
    setIsDrawerOpen(false)
  }

  const handleLogout = async () => {
    try {
      await logout(undefined).unwrap()
    } catch {
      // Очищаем сессию на клиенте даже при сбое запроса.
    }
    dispatch(clearUser())
    await navigate("/")
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: isFullWidth ? "none" : 1280,
        minHeight: "100vh",
        mx: "auto",
      }}
    >
      <PageHeader
        title={t(page?.titleKey ?? "navigation.home")}
        leadingAction={
          !isMenuPinned && (
            <IconButton
              aria-label={t("navigation.openMenu")}
              aria-haspopup="dialog"
              aria-expanded={isDrawerOpen}
              aria-controls={isDrawerOpen ? drawerId : undefined}
              onClick={() => {
                setIsDrawerOpen(true)
              }}
            >
              <MenuIcon />
            </IconButton>
          )
        }
        actions={
          user && (
            <UserMenu
              user={user}
              isLoggingOut={isLoggingOut}
              isFullWidth={isFullWidth}
              onToggleFullWidth={toggleFullWidth}
              isMenuPinned={isMenuPinned}
              onToggleMenuPinned={toggleMenuPinned}
              onLogout={() => {
                void handleLogout()
              }}
            />
          )
        }
      />
      <Box sx={{ display: "flex", flex: 1 }}>
        {isMenuPinned && (
          <Box
            sx={[
              navigationSurface,
              {
                width: { xs: 52, sm: 216 },
                flexShrink: 0,
                borderInlineEnd: 1,
                borderColor: "divider",
              },
            ]}
          >
            <SideNavigation compactOnMobile />
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>
      <Drawer
        open={isDrawerOpen}
        onClose={closeDrawer}
        slotProps={{
          paper: {
            id: drawerId,
            "aria-label": t("navigation.sections"),
            sx: [
              navigationSurface,
              { width: 240, maxWidth: "85vw", backgroundImage: "none" },
            ],
          },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
          <IconButton
            aria-label={t("navigation.closeMenu")}
            onClick={closeDrawer}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <SideNavigation onNavigate={closeDrawer} />
      </Drawer>
    </Box>
  )
}
