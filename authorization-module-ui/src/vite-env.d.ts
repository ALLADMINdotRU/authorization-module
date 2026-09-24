/// <reference types="vite/client" />

/* eslint-disable @typescript-eslint/consistent-type-definitions */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
/* eslint-enable @typescript-eslint/consistent-type-definitions */

declare module "*.module.less" {
  const classes: Record<string, string>
  export default classes
  // Для синтаксиса `import * as styles`
  export = classes
}
