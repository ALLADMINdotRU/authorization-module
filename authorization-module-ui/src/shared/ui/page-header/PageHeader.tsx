import { Box, Typography } from "@mui/material"
import type { ReactNode } from "react"

type PageHeaderProps = {
  title: string
  leadingAction?: ReactNode
  actions: ReactNode
}

export const PageHeader = ({
  title,
  leadingAction,
  actions,
}: PageHeaderProps) => (
  <Box
    component="header"
    sx={theme => ({
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      columnGap: 2,
      rowGap: 1,
      px: 2,
      py: 1,
      borderBottom: 1,
      borderColor: "divider",
      backgroundColor: "#dce6fb",
      backgroundImage: "linear-gradient(110deg, #e8efff, #cddaf5)",
      ...theme.applyStyles("dark", {
        backgroundColor: "#23304a",
        backgroundImage: "linear-gradient(110deg, #1c2639, #2b3b59)",
      }),
    })}
  >
    {leadingAction}
    <Typography
      variant="h4"
      component="h1"
      sx={{ flex: 1, overflowWrap: "anywhere", minWidth: 0 }}
    >
      {title}
    </Typography>
    <Box
      sx={{
        display: "flex",
        gap: 1,
        alignItems: "center",
        justifyContent: "flex-end",
        flexWrap: "wrap",
        ml: "auto",
      }}
    >
      {actions}
    </Box>
  </Box>
)
