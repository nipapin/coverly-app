import { Box, Paper, Typography, TextField, Button, Alert, Container } from "@mui/material";

export function LoginForm({
  login,
  password,
  authError,
  isAuthLoading,
  onChangeLogin,
  onChangePassword,
  onSubmit,
}) {
  return (
    <Container
      maxWidth="sm"
      sx={{
        py: { xs: 6, md: 8 },
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 3,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Вход в панель модерации обложек
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Это внутренний инструмент. Введите логин и пароль для доступа к правилам модерации.
        </Typography>

        <Box component="form" onSubmit={onSubmit} display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Логин"
            value={login}
            onChange={(e) => onChangeLogin(e.target.value)}
            autoComplete="username"
            fullWidth
          />
          <TextField
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => onChangePassword(e.target.value)}
            autoComplete="current-password"
            fullWidth
          />
          {authError && (
            <Alert severity="error" variant="outlined">
              {authError}
            </Alert>
          )}
          <Box display="flex" justifyContent="flex-end">
            <Button type="submit" variant="contained" disabled={isAuthLoading}>
              {isAuthLoading ? "Вход..." : "Войти"}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}

