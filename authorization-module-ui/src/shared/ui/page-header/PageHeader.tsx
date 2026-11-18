import { Box, Typography } from "@mui/material"
import type { ReactNode } from "react"

type PageHeaderProps = {
  title: string
  actions: ReactNode
}

export const PageHeader = ({ title, actions }: PageHeaderProps) => (
  <Box
    component="header"
    sx={{
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      columnGap: 2,
      rowGap: 1,
      px: 2,
      pt: 2,
    }}
  >
    <Typography
      variant="h4"
      component="h1"
      sx={{ overflowWrap: "anywhere", minWidth: 0 }}
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
