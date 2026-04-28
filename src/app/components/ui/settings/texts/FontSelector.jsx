import { useFonts } from "@/app/hooks/useFonts";
import { useFontStore } from "@/app/stores/FontStore";
import { Box, MenuItem, Select, Slider, TextField, Typography } from "@mui/material";

export default function FontSelector() {
	const { fonts } = useFonts();
	const { font, setFont } = useFontStore();

	const handleFontChange = (e) => {
		setFont(e.target.value);
	};

	// NB: the default font is now seeded by `useFontLoader()` (mounted by
	// `MainCanvas`) so this component doesn't need its own bootstrap effect —
	// by the time the user can open the Texts tab, FontStore is already in
	// sync with `template.fonts[0]`.

	if (!fonts) return null;

	return (
		<Box>
			<Select fullWidth size='small' value={font} onChange={handleFontChange}>
				{fonts.map((font) => (
					<MenuItem key={font.fontFamily} value={font.fontFamily}>
						<Typography sx={{ fontFamily: font.fontFamily }}>{font.fontFamily}</Typography>
					</MenuItem>
				))}
			</Select>
			<FontSizeSlider />
		</Box>
	);
}

const FontSizeSlider = () => {
	const { fontSize, setFontSize } = useFontStore();

	const handleFontSizeChange = (e, newValue) => {
		setFontSize(newValue);
	};

	const handleFontSizeChangeTextField = (e) => {
		setFontSize(Math.max(0, Math.min(200, e.target.value)));
	};

	return (
		<Box display='flex' flexDirection='column' gap='0.5rem' pt='1rem'>
			<Box display='flex' alignItems='center' gap='0.5rem' justifyContent='space-between'>
				<Typography>Font Size</Typography>
				<TextField
					size='small'
					value={Math.round(fontSize)}
					onChange={handleFontSizeChangeTextField}
					slotProps={{ htmlInput: { sx: { textAlign: "center", width: "30px" } } }}
				/>
			</Box>
			<Slider min={10} max={200} value={fontSize} onChange={handleFontSizeChange} size='small' />
		</Box>
	);
};
