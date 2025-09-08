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

	const handleTransformEnd = (e) => {
		const target = e.target;
		const parent = target.getParent();
		const name = parent.name();
		const modifiedTemplate = {
			...template,
			layers: template.layers.map((layer) => {
				if (layer.name === name) {
					return {
						...layer,
						children: layer.children.map((child) => ({
							...child,
							variants: child.variants.map((variant) => (variant.src === child.src ? { ...variant, transform: saveTransform(target) } : variant))
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
