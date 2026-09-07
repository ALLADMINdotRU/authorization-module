import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material"
import { Provider } from "react-redux"
import { RouterProvider } from "react-router-dom"
import { router } from "./app/router"
import { store } from "./app/store"
import { NotificationSnackbar } from "./shared/notifications"
import "./main.css"
const container = document.getElementById("root")

if (container) {
  const root = createRoot(container)

  root.render(
    <StrictMode>
      <ThemeProvider
        theme={createTheme({
          components: {
            MuiCssBaseline: {
              styleOverrides: {
                body: {
                  background:
                    "linear-gradient(135deg, #fdfdfd 0%, #d7dcf7 100%)",
                  minHeight: "100vh",
                },
              },
            },
          },
        })}
      >
        <CssBaseline />
        <Provider store={store}>
          <RouterProvider router={router} />
          <NotificationSnackbar />
        </Provider>
      </ThemeProvider>
    </StrictMode>,
  )
} else {
  throw new Error(
    "Root element with ID 'root' was not found in the document. Ensure there is a corresponding HTML element with the ID 'root' in your HTML file.",
  )
}
