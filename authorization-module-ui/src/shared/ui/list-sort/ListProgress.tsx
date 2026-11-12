import { Box, LinearProgress } from "@mui/material"
import { useTranslation } from "react-i18next"

export const ListProgress = ({ isFetching }: { isFetching: boolean }) => {
  const { t } = useTranslation()

  return (
    <Box sx={{ height: 4 }}>
      {isFetching && <LinearProgress aria-label={t("common.loading")} />}
    </Box>
  )
}
