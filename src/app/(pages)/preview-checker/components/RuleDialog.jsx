import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from "@mui/material";

export function RuleDialog({ open, mode, value, isSaving, onChange, onClose, onSave }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === "edit" ? "Редактировать правило" : "Новое правило"}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Текст правила"
          fullWidth
          multiline
          minRows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button onClick={onSave} variant="contained" disabled={isSaving || !value.trim()}>
          {isSaving ? "Сохранение..." : "Сохранить"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

