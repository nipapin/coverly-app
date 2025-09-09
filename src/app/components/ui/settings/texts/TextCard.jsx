import { useTextStore } from "@/app/stores/TextStore";
import { TextField } from "@mui/material";

const LayerNameMap = {
	"left-text": "Left Text",
	"right-text": "Right Text"
};

export default function TextCard({ layer }) {
	const { texts, setTexts } = useTextStore();
	const handleChange = (e) => {
		setTexts({ ...texts, [layer.name]: e.target.value });
	};
	return <TextField fullWidth value={texts[layer.name] || ""} onChange={handleChange} placeholder='Sample Text' label={LayerNameMap[layer.name]} />;
}
