import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material"
import type { Theme } from "@mui/material/styles"
import { useEffect, useId, useState } from "react"
import Cropper, { type Area } from "react-easy-crop"
import "react-easy-crop/react-easy-crop.css"
import { useTranslation } from "react-i18next"

const AVATAR_SIZE = 512
const MAX_ZOOM = 3

type AvatarCropDialogProps = {
  file: File
  onCancel: () => void
  onApply: (avatar: Blob) => void
}

export const AvatarCropDialog = ({
  file,
  onCancel,
  onApply,
}: AvatarCropDialogProps) => {
  const { t } = useTranslation()
  const titleId = useId()
  const fullScreen = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("sm"),
  )
  const [image, setImage] = useState<HTMLImageElement>()
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area>()
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<
    "profile.photoError" | "profile.cropError"
  >()

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const source = new Image()
    source.src = url
    let cancelled = false

    void source.decode().then(
      () => {
        if (!cancelled) setImage(source)
      },
      () => {
        if (!cancelled) setError("profile.photoError")
      },
    )

    return () => {
      cancelled = true
      URL.revokeObjectURL(url)
    }
  }, [file])

  const handleApply = async () => {
    if (!image || !area || applying) return

    setApplying(true)
    setError(undefined)

    try {
      const canvas = document.createElement("canvas")
      canvas.width = AVATAR_SIZE
      canvas.height = AVATAR_SIZE
      const context = canvas.getContext("2d")
      if (!context) throw new Error("Canvas is unavailable")

      context.drawImage(
        image,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        AVATAR_SIZE,
        AVATAR_SIZE,
      )

      const avatar = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(resolve, "image/webp", 0.9)
      })
      if (!avatar) throw new Error("Avatar encoding failed")

      onApply(avatar)
    } catch {
      setError("profile.cropError")
      setApplying(false)
    }
  }

  return (
    <Dialog
      open
      onClose={applying ? undefined : onCancel}
      aria-labelledby={titleId}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle id={titleId}>{t("profile.cropTitle")}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {image && (
            <>
              <Box
                sx={{
                  position: "relative",
                  height: "clamp(180px, 52dvh, 420px)",
                  bgcolor: "grey.900",
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <Cropper
                  image={image.src}
                  crop={crop}
                  zoom={zoom}
                  maxZoom={MAX_ZOOM}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  zoomWithScroll={false}
                  keyboardStep={5}
                  disableAutomaticStylesInjection
                  mediaProps={{ alt: "" }}
                  cropperProps={{
                    role: "group",
                    "aria-label": t("profile.cropArea"),
                  }}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropAreaChange={(_, pixels) => {
                    setArea(pixels)
                  }}
                />
              </Box>
              <Box sx={{ px: 1 }}>
                <Typography variant="body2">{t("profile.zoom")}</Typography>
                <Slider
                  aria-label={t("profile.zoom")}
                  value={zoom}
                  min={1}
                  max={MAX_ZOOM}
                  step={0.01}
                  onChange={(_, value) => {
                    if (typeof value === "number") setZoom(value)
                  }}
                />
              </Box>
            </>
          )}
          {!image && !error && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress aria-label={t("common.loading")} />
            </Box>
          )}
          {error && <Alert severity="error">{t(error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={applying}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="contained"
          disabled={!area}
          loading={applying}
          onClick={() => {
            void handleApply()
          }}
        >
          {t("profile.applyCrop")}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
