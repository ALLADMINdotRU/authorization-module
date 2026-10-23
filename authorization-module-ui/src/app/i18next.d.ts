import type ru from "../locales/ru"

declare module "i18next" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface CustomTypeOptions {
    defaultNS: "translation"
    resources: {
      translation: typeof ru
    }
  }
}
