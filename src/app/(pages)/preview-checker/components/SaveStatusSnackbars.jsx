import { Snackbar, Alert } from "@mui/material";

export function SaveStatusSnackbars({ saveSuccess, saveError, onCloseSuccess, onCloseError }) {
  return (
    <>
      <Snackbar
        open={saveSuccess}
        autoHideDuration={2500}
        onClose={onCloseSuccess}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={onCloseSuccess} severity="success" sx={{ width: "100%" }}>
          Правила сохранены
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(saveError)}
        autoHideDuration={4000}
        onClose={onCloseError}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={onCloseError} severity="error" sx={{ width: "100%" }}>
          {saveError}
        </Alert>
      </Snackbar>
    </>
  );
}

