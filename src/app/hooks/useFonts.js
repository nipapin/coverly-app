import { useEffect, useRef, useState } from "react";
import { useFontStore } from "../stores/FontStore";
import { useStageStore } from "../stores/StageStore";
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

const loadFontFamily = async ({ fontFamily, variants }) => {
	for (const { style, file } of variants) {
		const encodedFile = encodeURIComponent(file);
		const format = encodedFile.endsWith(".ttf") ? "truetype" : "opentype";
		const { fontStyle, fontWeight } = parseStyleWeight(style);
		const font = new FontFace(fontFamily, `url(/fonts/${encodedFile}) format(${format})`, {
			style: fontStyle,
			weight: fontWeight,
		});
		const loadedFont = await font.load();
		document.fonts.add(loadedFont);
	}
};

/**
 * Read-only access to the template's font list. Safe to call from any render
 * — does **not** trigger loading. The actual `FontFace.load()` work happens
 * once globally via `useFontLoader()` mounted by `MainCanvas`.
 */
export const useFonts = () => {
	const template = useTemplateStore((s) => s.template);
	return { fonts: template?.fonts || null };
};

/**
 * One-shot font bootstrap for the canvas.
 *
 * The previous implementation kicked off `FontFace.load()` from inside the
 * `FontSelector` render — but `FontSelector` only mounts when the user opens
 * the *Texts* tab, and the editor opens on the *Images* tab. Result: until the
 * user happened to switch tabs, Konva drew text with the system fallback
 * (visible as the wrong serif "SAMPLE TEXT" on first paint).
 *
 * This hook fixes that by:
 *   1. Loading every `template.fonts` entry into `document.fonts` once.
 *   2. Seeding `FontStore.font` with the template's first font family if it's
 *      still on the hardcoded default and the template ships a different
 *      family (otherwise Konva would render with a name not in `document.fonts`
 *      and silently fall back).
 *   3. Calling `stage.batchDraw()` after `document.fonts.ready` resolves so
 *      already-rendered Text nodes re-measure with the real metrics.
 *
 * Mount it once near the canvas root (see `MainCanvas`).
 */
export const useFontLoader = () => {
	const template = useTemplateStore((s) => s.template);
	const stage = useStageStore((s) => s.stage);
	const setFont = useFontStore((s) => s.setFont);
	const currentFont = useFontStore((s) => s.font);
	const [fontsLoaded, setFontsLoaded] = useState(false);
	const startedRef = useRef(false);

	useEffect(() => {
		if (startedRef.current) return;
		const fonts = template?.fonts;
		if (!Array.isArray(fonts) || fonts.length === 0) {
			// No fonts to load — nothing to wait on. We mark loaded async so
			// the effect body only schedules state changes (avoids the
			// `set-state-in-effect` lint and a cascading render).
			Promise.resolve().then(() => setFontsLoaded(true));
			return;
		}
		startedRef.current = true;

		const firstFamily = fonts[0]?.fontFamily;
		if (firstFamily && currentFont !== firstFamily) {
			// Only override the store default. If the user already picked a
			// font (e.g. via FontSelector) we don't stomp on their choice.
			const storeDefault = "Intro Head";
			if (currentFont === storeDefault) {
				setFont(firstFamily);
			}
		}

		let cancelled = false;
		(async () => {
			try {
				await Promise.all(fonts.map(loadFontFamily));
				if (typeof document !== "undefined" && document.fonts?.ready) {
					await document.fonts.ready;
				}
			} catch (e) {
				console.warn("[useFontLoader] failed to load fonts:", e);
			}
			if (!cancelled) setFontsLoaded(true);
		})();
		return () => {
			cancelled = true;
		};
		// `currentFont` and `setFont` are intentionally excluded — we only
		// react to template changes (i.e. a different workflow loaded), and we
		// want to seed with the value present at boot, not chase user edits.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [template]);

	useEffect(() => {
		if (!fontsLoaded || !stage) return;
		// `batchDraw` re-runs Konva's measure pass; without this the Text
		// nodes that rendered before fonts were available stay stuck on the
		// system fallback's metrics until something else triggers a redraw.
		stage.batchDraw();
	}, [fontsLoaded, stage]);

	return { fontsLoaded };
};
