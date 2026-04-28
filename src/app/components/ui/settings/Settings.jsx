import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Box, Button, Divider, Paper } from "@mui/material";
import { useState } from "react";
import AssetsTab from "./assets/AssetsTab";
import DisplayTab from "./display/DisplayTab";
import ImagesTab from "./images/ImagesTab";
import PresetsTab from "./presets/PresetsTab";
import SettingsHeader from "./SettingsHeader";
import TextsTab from "./texts/TextsTab";
import TranslateTab from "./translate/TranslateTab";

const PRESETS_TAB_ID = "presets";
const DISPLAY_TAB_ID = "display";

const TabMap = {
  images: { id: "images", name: "Images", component: <ImagesTab /> },
  texts: { id: "texts", name: "Texts", component: <TextsTab /> },
  assets: { id: "assets", name: "Assets", component: <AssetsTab /> },
  translate: { id: "translate", name: "Translate", component: <TranslateTab /> },
  [PRESETS_TAB_ID]: { id: PRESETS_TAB_ID, name: "Presets", component: <PresetsTab /> },
  [DISPLAY_TAB_ID]: { id: DISPLAY_TAB_ID, name: "Display", component: <DisplayTab /> },
};

export default function Settings() {
  const { template } = useTemplateStore();
  const [activeTab, setActiveTab] = useState("images");
  // Presets and Display tabs are always available — they don't depend on what
  // the current template ships in `overlay`.
  const tabs = [...(template?.overlay || []), PRESETS_TAB_ID, DISPLAY_TAB_ID];

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
