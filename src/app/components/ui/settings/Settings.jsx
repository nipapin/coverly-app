import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Download } from "@mui/icons-material";
import { Box, Button, Divider, Paper, Typography } from "@mui/material";
import { useState } from "react";
import ImagesTab from "./images/ImagesTab";

export default function Settings() {
	const { template } = useTemplateStore();
	const [activeTab, setActiveTab] = useState("images");
	const images = template.layers.filter((layer) => layer.children?.some((child) => child.type === "image"));
	const texts = template.layers.filter((layer) => layer.children?.some((child) => child.type === "text"));
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
			<Button variant='contained' sx={{ mt: "auto" }} startIcon={<Download />} fullWidth>
				Export
			</Button>
		</Paper>
	);
}

function TextsTab({ visible }) {
	return <Box display={visible ? "block" : "none"}>TextsTab</Box>;
}
