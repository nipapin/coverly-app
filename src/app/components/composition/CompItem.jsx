import { useTemplateStore } from "@/app/stores/TemplateStore";
import { useEffect, useState } from "react";
import { Group, Image, Layer } from "react-konva";

export default function CompItem() {
	const { template } = useTemplateStore();
	const [textLayers, setTextLayers] = useState([]);
	const [imageLayers, setImageLayers] = useState([]);

	useEffect(() => {
		if (!template) return;
		const textLayers = template.layers.filter((layer) => layer.type === "group" && layer.children?.some((child) => child.type === "text"));
		const imageLayers = template.layers.filter((layer) => layer.type === "group" && layer.children?.some((child) => child.type === "image"));
		setTextLayers(textLayers);
		setImageLayers(imageLayers);
	}, []);

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
	return (
		<Group>
			<Image />
		</Group>
	);
}

function TextItem({ layer }) {
	return <></>;
}
