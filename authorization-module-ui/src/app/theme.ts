import { createTheme } from "@mui/material/styles"

export const appTheme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes: { dark: true },
  components: {
    MuiCssBaseline: {
      styleOverrides: theme => ({
        body: { minHeight: "100vh" },
        ...theme.applyStyles("light", {
          body: {
            backgroundImage:
              "linear-gradient(135deg, #fdfdfd 0%, #d7dcf7 100%)",
          },
        }),
      }),
    },
  },
})
