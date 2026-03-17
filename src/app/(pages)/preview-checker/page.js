"use client";

import "./page.css";

import { Box, Container, Typography, Paper, Chip } from "@mui/material";
import { useMemo } from "react";
import { usePreviewAuth } from "./hooks/usePreviewAuth";
import { usePreviewRules } from "./hooks/usePreviewRules";
import { LoginForm } from "./components/LoginForm";
import { RulesList } from "./components/RulesList";
import { RuleDialog } from "./components/RuleDialog";
import { SaveStatusSnackbars } from "./components/SaveStatusSnackbars";

export default function PreviewChecker() {
  const auth = usePreviewAuth();
  const rulesState = usePreviewRules(auth.authToken, auth.logout);

  const hasToken = useMemo(() => Boolean(auth.authToken), [auth.authToken]);

  if (!hasToken) {
    return (
      <LoginForm
        login={auth.login}
        password={auth.password}
        authError={auth.authError}
        isAuthLoading={auth.isAuthLoading}
        onChangeLogin={auth.setLogin}
        onChangePassword={auth.setPassword}
        onSubmit={auth.handleLoginSubmit}
      />
    );
  }

  return (
    <Container
      maxWidth="lg"
      sx={{ py: { xs: 3, md: 4 }, height: "100%", overflow: "auto", gap: 2, display: "flex", flexDirection: "column" }}
    >
      <Box display={"flex"} gap={1} flexDirection={"column"}>
        <Typography variant="h1" fontWeight={600} fontSize={"2rem"}>
          Модерация обложек — правила
        </Typography>
        <Box display={"flex"} alignItems={"center"} justifyContent={"space-between"}>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Отредактируйте список требований, по которым модель проверяет обложки.
          </Typography>
          <Chip label={`Пунктов: ${rulesState.rules.length}`} color="default" variant="outlined" />
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", minHeight: 0, borderRadius: 2 }}>
        <RulesList
          rules={rulesState.rules}
          selectedIndex={rulesState.selectedIndex}
          onSelect={rulesState.setSelectedIndex}
          onEdit={rulesState.openEditDialog}
          onDelete={rulesState.handleDeleteRule}
          onCreate={rulesState.openCreateDialog}
        />

        <RuleDialog
          open={rulesState.isDialogOpen}
          mode={rulesState.dialogMode}
          value={rulesState.dialogValue}
          isSaving={rulesState.isSaving}
          onChange={rulesState.setDialogValue}
          onClose={rulesState.closeDialog}
          onSave={rulesState.handleDialogSave}
        />

        <SaveStatusSnackbars
          saveSuccess={rulesState.saveSuccess}
          saveError={rulesState.saveError}
          onCloseSuccess={rulesState.closeSaveSuccess}
          onCloseError={rulesState.closeSaveError}
        />
      </Paper>
    </Container>
  );
}
