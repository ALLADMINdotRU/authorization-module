import { Box, Button } from "@mui/material"
import { languages, useLanguage } from "./useLanguage"

export const LanguageSwitcher = () => {
  const { language, changeLanguage } = useLanguage()

  return (
    <Box sx={{ display: "flex", gap: 0.5 }}>
      {languages.map(({ code, label }) => (
        <Button
          key={code}
          size="small"
          variant={language === code ? "contained" : "outlined"}
          onClick={() => {
            changeLanguage(code)
          }}
        >
          {label}
        </Button>
      ))}
    </Box>
  )
}
