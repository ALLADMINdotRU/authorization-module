import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

export type NotificationSeverity = "error" | "warning" | "info" | "success"

type Notification = {
  id: number
  message: string
  severity: NotificationSeverity
}

type NotificationsState = {
  current: Notification | null
}

const initialState: NotificationsState = {
  current: null,
}

let nextNotificationId = 0

export const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    showNotification: (
      state,
      action: PayloadAction<{
        message: string
        severity?: NotificationSeverity
      }>,
    ) => {
      nextNotificationId += 1
      state.current = {
        id: nextNotificationId,
        message: action.payload.message,
        severity: action.payload.severity ?? "error",
      }
    },
    clearNotification: state => {
      state.current = null
    },
  },
})

export const { showNotification, clearNotification } =
  notificationsSlice.actions
