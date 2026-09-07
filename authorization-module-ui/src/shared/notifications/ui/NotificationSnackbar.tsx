import { Alert, Snackbar } from "@mui/material"
import { useAppDispatch, useAppSelector } from "../../../app/hooks"
import { clearNotification } from "../model/notificationsSlice"

export const NotificationSnackbar = () => {
  const dispatch = useAppDispatch()
  const notification = useAppSelector(state => state.notifications.current)

  const handleClose = () => {
    dispatch(clearNotification())
  }

  return (
    <Snackbar
      open={notification !== null}
      autoHideDuration={5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      key={notification?.id}
    >
      <Alert
        onClose={handleClose}
        severity={notification?.severity ?? "error"}
        variant="filled"
      >
        {notification?.message}
      </Alert>
    </Snackbar>
  )
}
