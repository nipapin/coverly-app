import { useTextStore } from "@/app/stores/TextStore";
import { Box, TextField } from "@mui/material";

const LayerNameMap = {
	"left-text": "Left Text",
	"right-text": "Right Text"
};

export default function TextCard({ layer }) {
	const { texts, setTexts } = useTextStore();
	const handleChange = (e) => {
		setTexts({ ...texts, [layer.name]: { ...texts[layer.name], text: e.target.value } });
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
			<TextField fullWidth value={texts[layer.name]?.text || ""} onChange={handleChange} placeholder='Sample Text' label={LayerNameMap[layer.name]} />
		</Box>
	);
}
