import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined"
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined"
import { Avatar, Button, Stack, Typography } from "@mui/material"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { AvatarCropDialog } from "./AvatarCropDialog"

type UserPhotoFieldProps = {
  photo?: Blob
  savedPhotoUrl?: string
  disabled: boolean
  onChange: (photo: Blob) => void
}

export const UserPhotoField = ({
  photo,
  savedPhotoUrl,
  disabled,
  onChange,
}: UserPhotoFieldProps) => {
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File>()
  const [previewUrl, setPreviewUrl] = useState<string>()

  useEffect(() => {
    if (!photo) return

    const url = URL.createObjectURL(photo)
    setPreviewUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [photo])

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ alignItems: "center", gridColumn: "1 / -1" }}
    >
      <Avatar
        src={previewUrl ?? savedPhotoUrl}
        alt={t("userPhoto.title")}
        sx={{ width: 64, height: 64 }}
      >
        <PersonOutlineOutlinedIcon />
      </Avatar>
      <Stack sx={{ alignItems: "flex-start" }}>
        <Typography variant="body2">{t("userPhoto.title")}</Typography>
        <Button
          type="button"
          size="small"
          startIcon={<PhotoCameraOutlinedIcon />}
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          {t(
            photo || savedPhotoUrl
              ? "userPhoto.changePhoto"
              : "userPhoto.choosePhoto",
          )}
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          disabled={disabled}
          onChange={event => {
            const file = event.currentTarget.files?.[0]
            if (file) setSelectedFile(file)
            event.currentTarget.value = ""
          }}
        />
      </Stack>
      {selectedFile && (
        <AvatarCropDialog
          file={selectedFile}
          onCancel={() => {
            setSelectedFile(undefined)
          }}
          onApply={croppedPhoto => {
            onChange(croppedPhoto)
            setSelectedFile(undefined)
          }}
        />
      )}
    </Stack>
  )
}
