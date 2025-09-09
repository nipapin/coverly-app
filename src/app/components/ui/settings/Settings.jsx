import { useStageStore } from "@/app/stores/StageStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Download } from "@mui/icons-material";
import { Box, Button, Divider, Paper, Typography } from "@mui/material";
import { useState } from "react";
import ImagesTab from "./images/ImagesTab";
import TextsTab from "./texts/TextsTab";
import { useLayoutStore } from "@/app/stores/LayoutStore";

export default function Settings() {
	const { template } = useTemplateStore();
	const { stage } = useStageStore();
	const { layout } = useLayoutStore();
	const [activeTab, setActiveTab] = useState("images");
	const images = template.layers.filter((layer) => layer.children?.some((child) => child.type === "image"));
	const texts = template.layers.filter((layer) => layer.children?.some((child) => child.type === "text"));

	const handleExport = () => {
		const virtualStage = stage.clone();
		virtualStage.width(layout.stage.width);
		virtualStage.height(layout.stage.height);
		const TemplateView = stage.findOne((node) => node.name() === "TemplateView");
		const TemplateViewClone = TemplateView.clone();
		TemplateViewClone.setAttrs({ x: 0, y: 0, width: layout.stage.width, height: layout.stage.height, scaleX: 1, scaleY: 1 });
		virtualStage.add(TemplateViewClone);
		const base64 = virtualStage.toDataURL({
			quality: 1,
			x: 0,
			y: 0,
			width: TemplateView.width(),
			height: TemplateView.height(),
			crossOrigin: "anonymous",
			mimeType: "image/jpeg"
		});

		const date = new Date().toLocaleDateString();
		const time = new Date().toLocaleTimeString();

		const link = document.createElement("a");
		link.href = base64;
		link.download = `export_${date}_${time}.jpg`;
		link.click();
		link.remove();
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
			<Button variant='contained' sx={{ mt: "auto" }} startIcon={<Download />} fullWidth onClick={handleExport}>
				Export
			</Button>
		</Paper>
	);
}
