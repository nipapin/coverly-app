import { useTemplateExport } from "@/app/hooks/useTemplateExport";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Download, Save } from "@mui/icons-material";
import { Box, Button, Divider, Paper, Typography } from "@mui/material";
import { useState } from "react";
import AssetsTab from "./assets/AssetsTab";
import ImagesTab from "./images/ImagesTab";
import TextsTab from "./texts/TextsTab";

const TabMap = {
  images: { id: "images", name: "Images", component: <ImagesTab /> },
  texts: { id: "texts", name: "Texts", component: <TextsTab /> },
  assets: { id: "assets", name: "Assets", component: <AssetsTab /> },
};

export default function Settings() {
  const { template } = useTemplateStore();
  const { exportTemplateView } = useTemplateExport();
  const [activeTab, setActiveTab] = useState("images");
  const [isSaving, setIsSaving] = useState(false);
  const tabs = template?.overlay || [];

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
      fetch(`/api/workflow/save`, {
        method: "POST",
        body: JSON.stringify({ sessionId, template }),
      }).then((res) => {
        console.log(res);
        setIsSaving(false);
      });
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: "0",
        position: "absolute",
        top: 0,
        right: 0,
        zIndex: 1000,
        padding: "1rem",
        minWidth: "400px",
        width: "400px",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography>Settings</Typography>
      <Divider sx={{ my: "1rem" }} />
      <Box display={"flex"} gap={"0.5rem"}>
        {tabs.map((tab) => {
          const { id, name, component } = TabMap[tab];
          return (
            <Button key={id} fullWidth onClick={() => setActiveTab(id)} variant={activeTab === id ? "contained" : "text"}>
              {name}
            </Button>
          );
        })}
      </Box>
      <Divider sx={{ my: "1rem" }} />
      {TabMap[activeTab]?.component || <></>}
      <Box sx={{ mt: "auto", display: "flex", flexDirection: "row", gap: "0.5rem" }}>
        <Button variant="contained" startIcon={<Save />} fullWidth onClick={handleSave} disabled={isSaving}>
          Save
        </Button>
        <Button variant="contained" startIcon={<Download />} fullWidth onClick={handleExport}>
          Export
        </Button>
      </Box>
    </Paper>
  );
}
