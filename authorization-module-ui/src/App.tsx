import * as styles from "./app.module.less"
import { Box, Button, Divider, Typography } from "@mui/material"
export const App = () => (
  <div className={styles.app}>
    <div className={styles.header}>Hello</div>
    <Typography gutterBottom variant="h6" component="div">
      Модуль авторизации
    </Typography>
    <Divider />
    <Box sx={{ p: 2 }}>
      <Button variant="contained">
        Войти
      </Button>
    </Box>
  </div>
)
