import { useStageStore } from "../stores/StageStore";
import { useTemplateStore } from "../stores/TemplateStore";

const saveTransform = (node) => {
	return {
		x: node.x(),
		y: node.y(),
		scaleX: node.scaleX(),
		scaleY: node.scaleY(),
		rotation: node.rotation()
	};
};

export const useTransform = () => {
	const { template, setTemplate } = useTemplateStore();
	const { stage } = useStageStore();

	const handleTransformEnd = (e) => {
		const target = e.target;
		const parent = target.getParent();
		const name = parent.name();
		const modifiedTemplate = {
			...template,
			layers: template.layers.map((layer) => {
				if (layer.name === name) {
					const layerGroup = stage.findOne((node) => node.name() === layer.name);
					const layerSource = layerGroup.children[0];
					const absolutePosition = layerSource.getAbsolutePosition(layerGroup);
					return {
						...layer,
						children: layer.children.map((child) => ({
							...child,
							variants: child.variants.map((variant) =>
								variant.src === child.src ? { ...variant, transform: saveTransform(target), clientRect: { ...absolutePosition } } : variant
							)
						}))
					};
				}
				return layer;
			})
		};
		setTemplate(modifiedTemplate);
	};

	return { handleTransformEnd };
};
