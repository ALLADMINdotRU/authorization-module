import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "../../../app/store"
import type { User } from "../../../entities/user/model/types"

const USER_STORAGE_KEY = "auth_user"

type AuthState = {
  user: User | null
}

const getStoredUser = (): User | null => {
  try {
    const stored = sessionStorage.getItem(USER_STORAGE_KEY)
    return stored ? (JSON.parse(stored) as User) : null
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
    setUser: (state, action: PayloadAction<User>) => {
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
