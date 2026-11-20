import { useTranslation } from "react-i18next"

export const languages = [
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
] as const

type Language = (typeof languages)[number]["code"]

export const useLanguage = () => {
  const { i18n } = useTranslation()
  const language = (i18n.resolvedLanguage ?? i18n.language).split("-")[0]

  const changeLanguage = (code: Language) => {
    void i18n.changeLanguage(code)
  }

  return { language, changeLanguage }
}
