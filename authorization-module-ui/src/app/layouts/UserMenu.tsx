import { useId, useState } from "react"
import Brightness6Outlined from "@mui/icons-material/Brightness6Outlined"
import CheckBoxOutlined from "@mui/icons-material/CheckBoxOutlined"
import CheckBoxOutlineBlankOutlined from "@mui/icons-material/CheckBoxOutlineBlankOutlined"
import LogoutOutlined from "@mui/icons-material/LogoutOutlined"
import PersonOutlined from "@mui/icons-material/PersonOutlined"
import {
  Avatar,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material"
import { useColorScheme } from "@mui/material/styles"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { getUserPhotoUrl } from "../../entities/user"
import type { UserProfile } from "../../entities/user"
import { languages, useLanguage } from "../../shared/ui/language-switcher"

type UserMenuProps = {
  user: UserProfile
  isLoggingOut: boolean
  isFullWidth: boolean
  onToggleFullWidth: () => void
  isMenuPinned: boolean
  onToggleMenuPinned: () => void
  onLogout: () => void
}

const fullWidth = { gridColumn: "1 / -1" }

export const UserMenu = ({
  user,
  isLoggingOut,
  isFullWidth,
  onToggleFullWidth,
  isMenuPinned,
  onToggleMenuPinned,
  onLogout,
}: UserMenuProps) => {
  const { t } = useTranslation()
  const { language, changeLanguage } = useLanguage()
  const { mode, setMode, systemMode } = useColorScheme()
  const isDark = (mode === "system" ? systemMode : mode) === "dark"
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null)
  const menuId = useId()
  const buttonId = `${menuId}-button`
  const isOpen = anchor !== null
  const fullName = user.full_name?.trim()
  const initials = fullName
    ? fullName
        .split(/\s+/)
        .slice(0, 2)
        .map(name => Array.from(name)[0])
        .join("")
    : Array.from(user.username.trim()).slice(0, 2).join("")

  const closeMenu = () => {
    setAnchor(null)
  }

  return (
    <>
      <IconButton
        id={buttonId}
        aria-label={t("userMenu.label")}
        aria-haspopup="menu"
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        sx={{ p: 0 }}
        onClick={event => {
          setAnchor(isOpen ? null : event.currentTarget)
        }}
      >
        <Avatar
          aria-hidden="true"
          src={getUserPhotoUrl(user, "avatar")}
          sx={{
            width: 64,
            height: 64,
            boxSizing: "border-box",
            border: 4,
            borderColor: "#b4bac1",
            "&:hover": { borderColor: "#b1b2b4" },
            fontSize: "1.5rem",
          }}
        >
          {initials.toUpperCase()}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={isOpen}
        onClose={closeMenu}
        variant="menu"
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: { sx: { minWidth: 208 } },
          list: {
            id: menuId,
            "aria-labelledby": buttonId,
            sx: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)" },
          },
        }}
      >
        <MenuItem component={Link} to="/me" onClick={closeMenu} sx={fullWidth}>
          <ListItemIcon>
            <PersonOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("navigation.profile")}</ListItemText>
        </MenuItem>
        {languages.map(({ code, label }) => (
          <MenuItem
            key={code}
            role="menuitemradio"
            aria-label={t(
              code === "ru" ? "userMenu.russian" : "userMenu.english",
            )}
            aria-checked={language === code}
            selected={language === code}
            onClick={() => {
              changeLanguage(code)
              closeMenu()
            }}
            sx={{ justifyContent: "center" }}
          >
            {label}
          </MenuItem>
        ))}
        <MenuItem
          onClick={() => {
            setMode(isDark ? "light" : "dark")
            closeMenu()
          }}
          sx={{ ...fullWidth, gap: 1 }}
        >
          <ListItemIcon>
            <Brightness6Outlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("userMenu.theme")}</ListItemText>
          <Typography variant="body2" color="text.secondary">
            {t(isDark ? "userMenu.dark" : "userMenu.light")}
          </Typography>
        </MenuItem>
        {[
          {
            label: t("userMenu.fullWidth"),
            checked: isFullWidth,
            toggle: onToggleFullWidth,
          },
          {
            label: t("userMenu.alwaysShowMenu"),
            checked: isMenuPinned,
            toggle: onToggleMenuPinned,
          },
        ].map(({ label, checked, toggle }) => (
          <MenuItem
            key={label}
            role="menuitemcheckbox"
            aria-checked={checked}
            onClick={() => {
              toggle()
              closeMenu()
            }}
            sx={fullWidth}
          >
            <ListItemIcon>
              {checked ? (
                <CheckBoxOutlined fontSize="small" />
              ) : (
                <CheckBoxOutlineBlankOutlined fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText>{label}</ListItemText>
          </MenuItem>
        ))}
        <Divider component="li" sx={fullWidth} />
        <MenuItem
          disabled={isLoggingOut}
          onClick={() => {
            closeMenu()
            onLogout()
          }}
          sx={{ ...fullWidth, color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <LogoutOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("common.logout")}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
