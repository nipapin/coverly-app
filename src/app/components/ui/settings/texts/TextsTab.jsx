import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Box } from "@mui/material";
import FontSelector from "./FontSelector";
import TextCard from "./TextCard";

export default function TextsTab({ visible }) {
	const { template } = useTemplateStore();
	const imageLayers = template.layers.filter((layer) => layer.children?.some((child) => child.type === "text")).flatMap((layer) => layer.children);
	return (
		<Box display={visible ? "flex" : "none"} flexDirection='column' gap='1rem'>
			<FontSelector />
			{imageLayers.map((layer) => (
				<TextCard key={layer.name} layer={layer} />
			))}
		</Box>
	);
}
