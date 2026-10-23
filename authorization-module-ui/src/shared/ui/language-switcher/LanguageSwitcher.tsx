import { Box, Button } from "@mui/material"
import { useTranslation } from "react-i18next"

const LANGUAGES = [
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
] as const

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation()
  const current = (i18n.resolvedLanguage ?? i18n.language).split("-")[0]

  return (
    <Box sx={{ display: "flex", gap: 0.5 }}>
      {LANGUAGES.map(({ code, label }) => (
        <Button
          key={code}
          size="small"
          variant={current === code ? "contained" : "outlined"}
          onClick={() => {
            void i18n.changeLanguage(code)
          }}
        >
          {label}
        </Button>
      ))}
    </Box>
  )
}
