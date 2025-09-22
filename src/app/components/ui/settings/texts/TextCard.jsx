import { useTextStore } from "@/app/stores/TextStore";
import { Box, Slider, TextField, Typography } from "@mui/material";

const LayerNameMap = {
	"left-text": "Left Text",
	"right-text": "Right Text"
};

export default function TextCard({ layer }) {
	const { texts, setTexts } = useTextStore();
	const handleChange = (e) => {
		setTexts({ ...texts, [layer.name]: { ...texts[layer.name], text: e.target.value } });
	};

	const handleOffsetXChange = (e, newValue) => {
		setTexts({ ...texts, [layer.name]: { ...texts[layer.name], offsetX: newValue } });
	};
	const handleOffsetYChange = (e, newValue) => {
		setTexts({ ...texts, [layer.name]: { ...texts[layer.name], offsetY: newValue } });
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
			<TextField fullWidth value={texts[layer.name]?.text || ""} onChange={handleChange} placeholder='Sample Text' label={LayerNameMap[layer.name]} />
			<Box display='flex' alignItems='center' justifyContent='space-between' mb='-0.5rem'>
				<Typography fontSize='10px'>Offset X</Typography>
				<Typography fontSize='10px'>{texts[layer.name]?.offsetX || 0}</Typography>
			</Box>
			<Slider min={-10} max={10} value={texts[layer.name]?.offsetX || 0} onChange={handleOffsetXChange} size='small' />
			<Box display='flex' alignItems='center' justifyContent='space-between' mb='-0.5rem'>
				<Typography fontSize='10px'>Offset Y</Typography>
				<Typography fontSize='10px'>{texts[layer.name]?.offsetY || 0}</Typography>
			</Box>
			<Slider min={-10} max={10} value={texts[layer.name]?.offsetY || 0} onChange={handleOffsetYChange} size='small' />
		</Box>
	);
}
