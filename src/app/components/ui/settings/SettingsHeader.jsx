import { useTemplateExport } from "@/app/hooks/useTemplateExport";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Download, Save } from "@mui/icons-material";
import { Box, CircularProgress, ClickAwayListener, IconButton, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import UndoRedoButtons from "./UndoRedoButtons";

export default function SettingsHeader() {
  const { exportTemplateView, exportTemplateThumbnail } = useTemplateExport();
  const [isSaving, setIsSaving] = useState(false);
  const { template, setTemplate } = useTemplateStore();
  const [isEditing, setIsEditing] = useState(false);
  const [projectName, setProjectName] = useState(template?.customName || "Untitled");

  const handleSubmit = (e) => {
    e.preventDefault();
    setProjectName(e.target.value);
    setTemplate({ ...template, customName: e.target.value });
  };

  const handleExport = async () => {
    try {
      const date = new Date().toLocaleDateString();
      const time = new Date().toLocaleTimeString();
      const filename = `template_export_${date}_${time}.jpg`;

      await exportTemplateView(filename);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const pathname = window.location.pathname;
      const sessionId = pathname.split("/").pop();
      const templateThumbnail = await exportTemplateThumbnail();
      fetch(`/api/workflow/save`, {
        method: "POST",
        body: JSON.stringify({ sessionId, template: { ...template, thumbnail: templateThumbnail } }),
      }).then((res) => {
        setIsSaving(false);
      });
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.which === 83 && e.ctrlKey) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // We intentionally bind once on mount — `handleSave` reads the latest
    // `template` via closure each call because it goes through the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box display={"flex"} gap={"0.5rem"} alignItems={"center"}>
      {isEditing ? (
        <ClickAwayListener onClickAway={() => setIsEditing(false)}>
          <TextField
            fullWidth
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project Name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setIsEditing(false);
                handleSubmit(e);
              }
            }}
          />
        </ClickAwayListener>
      ) : (
        <Typography
          onClick={() => setIsEditing(true)}
          sx={{ cursor: "pointer" }}
          flexGrow={1}
          display="flex"
          alignItems="center"
          gap="0.5rem"
        >
          {projectName}
        </Typography>
      )}
      <UndoRedoButtons />
      <IconButton onClick={handleSave}>{isSaving ? <CircularProgress size={16} /> : <Save />}</IconButton>
      <IconButton onClick={handleExport}>
        <Download />
      </IconButton>
    </Box>
  );
}
