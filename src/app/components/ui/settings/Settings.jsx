import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Box, Button, Divider, Paper } from "@mui/material";
import { useState } from "react";
import AssetsTab from "./assets/AssetsTab";
import ImagesTab from "./images/ImagesTab";
import SettingsHeader from "./SettingsHeader";
import TextsTab from "./texts/TextsTab";

const TabMap = {
  images: { id: "images", name: "Images", component: <ImagesTab /> },
  texts: { id: "texts", name: "Texts", component: <TextsTab /> },
  assets: { id: "assets", name: "Assets", component: <AssetsTab /> },
};

export default function Settings() {
  const { template } = useTemplateStore();
  const [activeTab, setActiveTab] = useState("images");
  const tabs = template?.overlay || [];

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
      <SettingsHeader />
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
    </Paper>
  );
}
