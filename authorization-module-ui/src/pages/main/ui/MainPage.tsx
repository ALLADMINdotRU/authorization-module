import { Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

export const MainPage = () => {
  const { t } = useTranslation()

  return <Typography sx={{ p: 2 }}>{t("navigation.homeMessage")}</Typography>
}
