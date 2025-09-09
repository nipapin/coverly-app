import { useTemplateStore } from "../stores/TemplateStore";

export function parseStyleWeight(style) {
	const lower = style.toLowerCase();

	let fontStyle = "normal";
	if (lower.includes("italic")) fontStyle = "italic";

	let fontWeight = "normal";
	if (lower.includes("thin")) fontWeight = "100";
	else if (lower.includes("extralight")) fontWeight = "200";
	else if (lower.includes("light")) fontWeight = "300";
	else if (lower.includes("regular")) fontWeight = "400";
	else if (lower.includes("medium")) fontWeight = "500";
	else if (lower.includes("semibold")) fontWeight = "600";
	else if (lower.includes("bold")) fontWeight = "700";
	else if (lower.includes("extrabold")) fontWeight = "800";
	else if (lower.includes("black")) fontWeight = "900";

	return { fontStyle, fontWeight };
}

const loadFont = async ({ fontFamily, variants }) => {
	for (const { style, file } of variants) {
		const encodedFile = encodeURIComponent(file);
		const font = new FontFace(fontFamily, `url(/fonts/${encodedFile}) format(${encodedFile.endsWith(".ttf") ? "truetype" : "opentype"})`, {
			style: parseStyleWeight(style).fontStyle,
			weight: parseStyleWeight(style).fontWeight
		});
		const loadedFont = await font.load();
		document.fonts.add(loadedFont);
	}
};

export const useFonts = () => {
	const { template } = useTemplateStore();
	const fonts = template.fonts;

	const initializeFonts = () => {
		if (!fonts) return;
		Promise.all(fonts.map(loadFont)).catch(console.error);
	};

	initializeFonts();
	return { fonts };
};
