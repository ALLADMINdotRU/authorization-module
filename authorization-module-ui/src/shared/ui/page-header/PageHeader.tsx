import { Typography } from "@mui/material"

type PageHeaderProps = {
  title: string
}

export const PageHeader = ({ title }: PageHeaderProps) => (
  <Typography variant="h4" component="h1" gutterBottom>
    {title}
  </Typography>
)
