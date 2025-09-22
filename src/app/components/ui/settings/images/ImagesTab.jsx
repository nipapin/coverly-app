import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Box } from "@mui/material";
import ModelSelector from "../ModelSelector";
import ImageCard from "./ImageCard";

export default function ImagesTab({ visible }) {
	const { template } = useTemplateStore();
	const imageLayers = template.layers.filter((layer) => layer.children?.some((child) => child.type === "image")).flatMap((layer) => layer.children);
	return (
		<Box display={visible ? "flex" : "none"} flexDirection='column' gap='0.5rem'>
			<ModelSelector />
			{imageLayers.map((layer) => (
				<ImageCard key={layer.name} layer={layer} />
			))}
		</Box>
	);
}
