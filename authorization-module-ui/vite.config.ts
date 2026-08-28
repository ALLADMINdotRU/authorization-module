import react from "@vitejs/plugin-react"
import * as path from "node:path"
import { defineConfig } from "vitest/config"
import packageJson from "./package.json" with { type: "json" }
// import { patchCssModules } from 'vite-css-modules'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    //    patchCssModules({
    //   generateSourceTypes: true,
    // declarationMap: true,
    //   })
  ],

  server: {
    open: true,
  },

  test: {
    root: import.meta.dirname,
    name: packageJson.name,
    environment: "jsdom",

    typecheck: {
      enabled: true,
      tsconfig: path.join(import.meta.dirname, "tsconfig.json"),
    },

    globals: true,
    watch: false,
    setupFiles: ["./src/setupTests.ts"],
  },
})
