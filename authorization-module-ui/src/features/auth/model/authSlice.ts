import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "../../../app/store"
import type { UserProfile } from "../../../entities/user/model/types"

const USER_STORAGE_KEY = "auth_user"

type AuthState = {
  user: UserProfile | null
}

const getStoredUser = (): UserProfile | null => {
  try {
    const stored = sessionStorage.getItem(USER_STORAGE_KEY)
    return stored ? (JSON.parse(stored) as UserProfile) : null
  } catch {
    return null
  }
}

const initialState: AuthState = {
  user: getStoredUser(),
}

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserProfile>) => {
      state.user = action.payload
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(action.payload))
    },
    clearUser: state => {
      state.user = null
      sessionStorage.removeItem(USER_STORAGE_KEY)
    },
  },
})

export const { setUser, clearUser } = authSlice.actions

export const selectUser = (state: RootState) => state.auth.user
