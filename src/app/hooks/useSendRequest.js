import { useTemplateStore } from "../stores/TemplateStore";
import { useStage } from "./useStage";
import { useUtils } from "./useUtils";

export const useSendRequest = () => {
	const { getLayer } = useStage();
	const { template } = useTemplateStore();
	const { isHasGaps } = useUtils();

	const generate = async (src, prompt) => {
		const response = await fetch(`/api/generate/gemini`, {
			method: "POST",
			body: JSON.stringify({ src, prompt })
		});

		if (!response.ok) {
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
			return null;
		}
		return await response.json();
	};

	const getGroupTransform = (group) => {
		return {
			x: group.getAbsolutePosition().x,
			y: group.getAbsolutePosition().y,
			width: group.getAttrs().width * group.getAbsoluteScale().x,
			height: group.getAttrs().height * group.getAbsoluteScale().y
		};
	};

	const getSourceTransform = (source) => {
		return {
			x: source.getClientRect().x,
			y: source.getClientRect().y,
			width: source.getClientRect().width,
			height: source.getClientRect().height
		};
	};

	const outpaintRequest = async ({ src, name, prompt, groupTransform, sourceTransform }) => {
		const generated = await generate(src, prompt);
		if (!generated) {
			return { severity: "error", message: "Error generating image" };
		}
		const outpainted = await outpaint(generated.src, { groupTransform, sourceTransform });
		if (!outpainted) {
			return { severity: "error", message: "Error outpainting image" };
		}
		return {
			severity: "success",
			message: "Your image has been proceed succsefully",
			template: {
				...template,
				layers: template.layers.map((templateLayer) => {
					if (templateLayer.name === name) {
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
			}
		};
	};

	const generateRequest = async ({ src, name, prompt }) => {
		const generated = await generate(src, prompt);
		if (!generated) {
			return { severity: "error", message: "Error generating image" };
		}
		return {
			severity: "success",
			message: "Your image has been proceed succsefully",
			template: {
				...template,
				layers: template.layers.map((templateLayer) => {
					if (templateLayer.name === name) {
						return {
							...templateLayer,
							children: templateLayer.children.map((child) =>
								child.type === "image"
									? {
											...child,
											src: generated.src,
											variants: [...child.variants, { src: generated.src, transform: child.variants[0].transform }]
									  }
									: child
							)
						};
					}

					return templateLayer;
				})
			}
		};
	};

	const sendRequest = async ({ src, name, prompt }) => {
		console.log(src, name, prompt);
		const group = getLayer(name);
		const source = group.children.find((child) => child.visible());

		const groupTransform = getGroupTransform(group);
		const sourceTransform = getSourceTransform(source);
		const outpaintRequired = isHasGaps(groupTransform, sourceTransform);
		if (outpaintRequired) {
			return await outpaintRequest({ src, name, prompt, groupTransform, sourceTransform });
		} else {
			return await generateRequest({ src, name, prompt });
		}
	};

	return { sendRequest };
};
