import { useTemplateStore } from "@/app/stores/TemplateStore";
import { useTextStore } from "@/app/stores/TextStore";
import { Box, Slider, Typography } from "@mui/material";
import FontSelector from "./FontSelector";
import TextCard from "./TextCard";

export default function TextsTab({ visible }) {
	const { template } = useTemplateStore();
	const { texts, setTexts } = useTextStore();
	const imageLayers = template.layers.filter((layer) => layer.children?.some((child) => child.type === "text")).flatMap((layer) => layer.children);
	const handleOffsetYChange = (e, newValue) => {
		setTexts({ ...texts, offsetY: newValue });
	};
	return (
		<Box display={visible ? "flex" : "none"} flexDirection='column' gap='1rem'>
			<FontSelector />
			{imageLayers.map((layer) => (
				<TextCard key={layer.name} layer={layer} />
			))}
			<Box display='flex' alignItems='center' justifyContent='space-between' mb='-0.5rem'>
				<Typography fontSize='10px'>Shift the text up or down</Typography>
				<Typography fontSize='10px'>{texts.offsetY || 0}</Typography>
			</Box>
			<Slider min={-10} max={10} value={texts.offsetY || 0} onChange={handleOffsetYChange} size='small' />
		</Box>
	);
}
