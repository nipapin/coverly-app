import { useTemplateStore } from "../stores/TemplateStore";

export function useLayers() {
	const { template } = useTemplateStore();

	const getLayer = (name) => {
		return template.layers.find((layer) => layer.name === name);
	};

	return { getLayer };
}
