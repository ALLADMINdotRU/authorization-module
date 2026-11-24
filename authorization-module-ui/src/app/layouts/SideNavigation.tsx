import AdminPanelSettingsOutlined from "@mui/icons-material/AdminPanelSettingsOutlined"
import DnsOutlined from "@mui/icons-material/DnsOutlined"
import PeopleOutlined from "@mui/icons-material/PeopleOutlined"
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material"
import { useTranslation } from "react-i18next"
import { NavLink } from "react-router-dom"

const sections = [
  { to: "/users", label: "navigation.users", Icon: PeopleOutlined },
  { to: "/roles", label: "navigation.roles", Icon: AdminPanelSettingsOutlined },
  { to: "/ldap-servers", label: "navigation.ldapServers", Icon: DnsOutlined },
] as const

type SideNavigationProps = {
  compactOnMobile?: boolean
  onNavigate?: () => void
}

export const SideNavigation = ({
  compactOnMobile = false,
  onNavigate,
}: SideNavigationProps) => {
  const { t } = useTranslation()

  return (
    <List
      component="nav"
      aria-label={t("navigation.sections")}
      sx={{ px: 0.5, "& > :not(:first-of-type)": { mt: 0.5 } }}
    >
      {sections.map(({ to, label, Icon }) => (
        <ListItem key={to} component="div" disablePadding>
          <Tooltip title={t(label)} placement="right">
            <ListItemButton
              component={NavLink}
              to={to}
              aria-label={t(label)}
              onClick={onNavigate}
              sx={{
                justifyContent: compactOnMobile
                  ? { xs: "center", sm: "flex-start" }
                  : "flex-start",
                px: compactOnMobile ? { xs: 0, sm: 1.5 } : 1.5,
                minHeight: 44,
                borderRadius: 1,
                "&[aria-current='page']": {
                  bgcolor: "action.selected",
                  color: "primary.main",
                  "&:hover": { bgcolor: "action.focus" },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, color: "inherit" }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={t(label)}
                sx={{
                  ml: 1.5,
                  display: compactOnMobile
                    ? { xs: "none", sm: "block" }
                    : "block",
                }}
              />
            </ListItemButton>
          </Tooltip>
        </ListItem>
      ))}
    </List>
  )
}
