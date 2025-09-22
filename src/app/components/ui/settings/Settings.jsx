import { useStageStore } from "@/app/stores/StageStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Download } from "@mui/icons-material";
import { Box, Button, Divider, Paper, Typography } from "@mui/material";
import { useState } from "react";
import ImagesTab from "./images/ImagesTab";
import TextsTab from "./texts/TextsTab";
import { useLayoutStore } from "@/app/stores/LayoutStore";
import { useTemplateExport } from "@/app/hooks/useTemplateExport";

export default function Settings() {
	const { template } = useTemplateStore();
	const { stage } = useStageStore();
	const { layout } = useLayoutStore();
	const { exportTemplateView } = useTemplateExport();
	const [activeTab, setActiveTab] = useState("images");
	const images = template.layers.filter((layer) => layer.children?.some((child) => child.type === "image"));
	const texts = template.layers.filter((layer) => layer.children?.some((child) => child.type === "text"));

	const handleExport = async () => {
		try {
			const date = new Date().toLocaleDateString();
			const time = new Date().toLocaleTimeString();
			const filename = `template_export_${date}_${time}.png`;

			await exportTemplateView(filename);
		} catch (error) {
			console.error("Export failed:", error);
		}
	};

	return (
		<Paper
			variant='outlined'
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
				flexDirection: "column"
			}}
		>
			<Typography>Settings</Typography>
			<Divider sx={{ my: "1rem" }} />
			<Box display={"flex"} gap={"0.5rem"}>
				<Button
					disabled={images.length === 0}
					fullWidth
					onClick={() => setActiveTab("images")}
					variant={activeTab === "images" ? "contained" : "text"}
				>
					Images
				</Button>
				<Button disabled={texts.length === 0} fullWidth onClick={() => setActiveTab("texts")} variant={activeTab === "texts" ? "contained" : "text"}>
					Texts
				</Button>
			</Box>
			<Divider sx={{ my: "1rem" }} />
			<ImagesTab visible={activeTab === "images"} />
			<TextsTab visible={activeTab === "texts"} />
			<Box sx={{ mt: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
				<Button variant='contained' startIcon={<Download />} fullWidth onClick={handleExport}>
					Export
				</Button>
			</Box>
		</Paper>
	);
}
