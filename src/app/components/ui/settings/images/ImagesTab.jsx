import { useModelStore } from "@/app/stores/ModelStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Box, MenuItem, Select } from "@mui/material";
import ImageCard from "./ImageCard";

export default function ImagesTab({ visible }) {
	const { template } = useTemplateStore();
	const { model, setModel } = useModelStore();
	const imageLayers = template.layers.filter((layer) => layer.children?.some((child) => child.type === "image")).flatMap((layer) => layer.children);
	return (
		<Box display={visible ? "flex" : "none"} flexDirection='column' gap='1rem'>
			<Select fullWidth size='small' value={model} onChange={(e) => setModel(e.target.value)}>
				<MenuItem value='flux'>FLUX</MenuItem>
				<MenuItem value='gemini'>GEMINI</MenuItem>
			</Select>
			{imageLayers.map((layer) => (
				<ImageCard key={layer.name} layer={layer} />
			))}
		</Box>
	);
}
