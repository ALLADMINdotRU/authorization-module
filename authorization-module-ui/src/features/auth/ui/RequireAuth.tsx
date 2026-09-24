import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAppSelector } from "../../../app/hooks"
import { selectUser } from "../model/authSlice"

type RequireAuthProps = {
  children: ReactNode
}

export const RequireAuth = ({ children }: RequireAuthProps) => {
  const user = useAppSelector(selectUser)

  if (!user) {
    return <Navigate to="/" replace />
  }

  return children
}
