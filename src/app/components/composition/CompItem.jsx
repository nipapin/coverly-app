import { useTemplateStore } from "@/app/stores/TemplateStore";
import { useMemo } from "react";
import { Group, Image, Layer } from "react-konva";

export default function CompItem() {
	const { template } = useTemplateStore();

	const { textLayers, imageLayers } = useMemo(() => {
		if (!template) return { textLayers: [], imageLayers: [] };
		const groupLayers = template.layers.filter((layer) => layer.type === "group");
		return {
			textLayers: groupLayers.filter((layer) => layer.children?.some((child) => child.type === "text")),
			imageLayers: groupLayers.filter((layer) => layer.children?.some((child) => child.type === "image")),
		};
	}, [template]);

	return (
		<Layer>
			{imageLayers.map((layer) => (
				<FootageItem key={layer.name} source={layer} />
			))}
			{textLayers.map((layer) => (
				<TextItem key={layer.name} layer={layer} />
			))}
		</Layer>
	);
}

function FootageItem({ source }) {
	void source;
	return (
		<Group>
			{/* eslint-disable-next-line jsx-a11y/alt-text */}
			<Image />
		</Group>
	);
}

function TextItem({ layer }) {
	void layer;
	return <></>;
}
