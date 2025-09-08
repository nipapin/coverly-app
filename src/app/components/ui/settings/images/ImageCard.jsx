import { useStage } from "@/app/hooks/useStage";
import { useUtils } from "@/app/hooks/useUtils";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { AutoAwesome } from "@mui/icons-material";
import { Alert, Button, Card, CardActions, CircularProgress, Snackbar } from "@mui/material";
import { useState } from "react";
import ImageCardContent from "./ImageCardContent";
import ImageCardHeader from "./ImageCardHeader";

export default function ImageCard({ layer }) {
	const [open, setOpen] = useState(false);
	const [severity, setSeverity] = useState("success");
	const [message, setMessage] = useState("");
	const { calculateGaps } = useUtils();
	const { getLayer } = useStage();
	const { template, setTemplate } = useTemplateStore();
	const [pending, setPending] = useState(false);
	const firstVariant = layer.variants[0];
	if (!firstVariant) return null;

	const generate = async (src, prompt) => {
		const response = await fetch(`/api/generate/gemini`, {
			method: "POST",
			body: JSON.stringify({ src, prompt })
		});

		if (!response.ok) {
			setOpen(true);
			setSeverity("error");
			setMessage("Error generating image");
			setPending(false);
			return null;
		}

		return await response.json();
	};

	const outpaint = async (src, transform) => {
		const response = await fetch(`/api/outpaint/gemini`, {
			method: "POST",
			body: JSON.stringify({ src, transform })
		});
		if (!response.ok) {
			setOpen(true);
			setSeverity("error");
			setMessage("Error outpainting image");
			setPending(false);
			return null;
		}
		return await response.json();
	};

	const handleGenerate = async (event) => {
		event.preventDefault();
		setPending(true);
		const formData = new FormData(event.target);
		const prompt = formData.get("prompt");

		const group = getLayer(layer.name);
		const source = group.children[0];

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
		const { needsFilling } = calculateGaps(groupTransform, sourceTransform);

		if (needsFilling) {
			setOpen(true);
			setSeverity("info");
			setMessage("Generating image...");
			const generated = await generate(layer.src, prompt);
			if (!generated) {
				setPending(false);
				return;
			}
			setOpen(false);
			setOpen(true);
			setSeverity("info");
			setMessage("Outpainting image...");
			const outpainted = await outpaint(generated.src, { groupTransform, sourceTransform });
			if (!outpainted) {
				return;
			}
			const modifiedTemplate = {
				...template,
				layers: template.layers.map((templateLayer) => {
					if (templateLayer.name === layer.name) {
						return {
							...templateLayer,
							children: templateLayer.children.map((child) =>
								child.type === "image"
									? {
											...child,
											variants: [...child.variants, ...outpainted.data.map((src) => ({ src, transform: null }))]
									  }
									: child
							)
						};
					}
					return templateLayer;
				})
			};
			setOpen(false);
			setOpen(true);
			setSeverity("success");
			setMessage("Outpainting image success");
			setTemplate(modifiedTemplate);
			setPending(false);
			return;
		} else {
			setOpen(true);
			setSeverity("info");
			setMessage("Generating image...");
			const generated = await generate(layer.src, prompt);
			if (!generated) {
				setPending(false);
				return;
			}
			setOpen(false);
			setOpen(true);
			setSeverity("success");
			setMessage("Generating image success");
			const modifiedTemplate = {
				...template,
				layers: template.layers.map((templateLayer) => {
					if (templateLayer.name === layer.name) {
						return {
							...templateLayer,
							children: templateLayer.children.map((child) =>
								child.type === "image"
									? {
											...child,
											variants: [...child.variants, { src: generated.src, transform: child.variants[0].transform }]
									  }
									: child
							)
						};
					}
					return templateLayer;
				})
			};
			setTemplate(modifiedTemplate);
			setPending(false);
		}
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
			<Snackbar open={open} onClose={() => setOpen(false)} autoHideDuration={3000}>
				<Alert severity={severity}>{message}</Alert>
			</Snackbar>
		</Card>
	);
}
