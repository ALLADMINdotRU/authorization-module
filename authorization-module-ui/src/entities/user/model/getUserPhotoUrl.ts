import type { UserProfile } from "./types"

export const getUserPhotoUrl = ({
  id,
  photo_updated_at,
}: Pick<UserProfile, "id" | "photo_updated_at">) => {
  if (!photo_updated_at) return undefined

  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "")
  const params = new URLSearchParams({ size: "profile", v: photo_updated_at })
  return `${baseUrl}/auth/users/${String(id)}/photo?${params.toString()}`
}
