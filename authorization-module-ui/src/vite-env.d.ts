/// <reference types="vite/client" />
declare module '*.module.less' {
  const classes: { [key: string]: string };
  export default classes;
  // Для синтаксиса `import * as styles`
  export = classes;
}