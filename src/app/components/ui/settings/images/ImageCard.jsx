import { useGenerationModel } from "@/app/hooks/useGenerationModel";
import { useStage } from "@/app/hooks/useStage";
import { useUtils } from "@/app/hooks/useUtils";
import { useLayoutStore } from "@/app/stores/LayoutStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { AutoAwesome } from "@mui/icons-material";
import { Button, Card, CardActions, CircularProgress } from "@mui/material";
import { useState } from "react";
import ImageCardContent from "./ImageCardContent";
import ImageCardHeader from "./ImageCardHeader";

export default function ImageCard({ layer }) {
	const { sendRequest } = useGenerationModel();
	const { layout } = useLayoutStore();
	const { calculateGaps } = useUtils();
	const { getLayer } = useStage();
	const { template, setTemplate } = useTemplateStore();
	const [pending, setPending] = useState(false);
	const firstVariant = layer.variants[0];
	if (!firstVariant) return null;

	const drawPreview = (rect, color) => {
		const area = document.createElement("div");
		area.className = "preview-area";
		area.style.position = "absolute";
		area.style.zIndex = "10000";
		area.style.left = `${rect.x}px`;
		area.style.top = `${rect.y}px`;
		area.style.width = `${rect.width}px`;
		area.style.height = `${rect.height}px`;
		area.style.border = `1px solid ${color}`;
		document.body.appendChild(area);
	};

	const handleGenerate = async (event) => {
		event.preventDefault();
		setPending(true);
		const formData = new FormData(event.target);
		const prompt = formData.get("prompt");

		const previewAreas = document.querySelectorAll(".preview-area");
		previewAreas.forEach((area) => area.remove());

		const group = getLayer(layer.name);
		const source = group.children[0];
		const sourceOffset = {
			x: source.getAbsolutePosition(source.getLayer()).x - source.getClientRect().x,
			y: source.getAbsolutePosition(source.getLayer()).y - source.getClientRect().y
		};

		const groupTransform = {
			x: group.getAbsolutePosition().x,
			y: group.getAbsolutePosition().y,
			width: group.getAttrs().width * group.getAbsoluteScale().x,
			height: group.getAttrs().height * group.getAbsoluteScale().y
		};

		const sourceTransform = {
			x: source.getClientRect().x,
			y: source.getClientRect().y,
			width: source.getClientRect().width,
			height: source.getClientRect().height
		};
		const { gaps, needsFilling } = calculateGaps(groupTransform, sourceTransform);
		console.log("group", groupTransform);
		console.log("source", sourceTransform);
		console.log("gap", gaps);
		console.log("needsFilling", needsFilling);

		drawPreview(groupTransform, "red");
		drawPreview(sourceTransform, "blue");

		setPending(false);
		return;
		const data = await sendRequest(layer.src, prompt);
		const modifiedTemplate = {
			...template,
			layers: template.layers.map((templateLayer) => {
				if (templateLayer.name === layer.name) {
					return {
						...templateLayer,
						children: templateLayer.children.map((child) =>
							child.type === "image" ? { ...child, variants: [...child.variants, { src: data.src, transform: child.variants[0].transform }] } : child
						)
					};
				}
				return templateLayer;
			})
		};
		setTemplate(modifiedTemplate);
		setPending(false);
	};

	return (
		<Card component={"form"} onSubmit={handleGenerate}>
			<ImageCardHeader src={firstVariant.src} name={layer.name} count={layer.variants.length} />
			<ImageCardContent variants={layer.variants} src={firstVariant.src} name={layer.name} />
			<CardActions>
				<Button variant='contained' startIcon={pending ? <CircularProgress size={16} /> : <AutoAwesome />} fullWidth type='submit' disabled={pending}>
					Generate
				</Button>
			</CardActions>
		</Card>
	);
}
