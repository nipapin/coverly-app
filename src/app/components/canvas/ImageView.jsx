import { useTransform } from "@/app/hooks/useTransform";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { useTransformerStore } from "@/app/stores/TransformerStore";
import { useEffect, useRef } from "react";
import { Image } from "react-konva";
import useImage from "use-image";
import NoImageView from "./NoImageView";

export default function ImageView({ item }) {
	return item.variants.length > 0 ? (
		<>
			{item.variants.map((variant) => (
				<ImageSource key={variant.src} variant={variant} visible={variant.src === item.src} layerName={item.name} />
			))}
		</>
	) : (
		<NoImageView item={item} />
	);
}

const ImageSource = ({ variant, visible, layerName }) => {
	const { template } = useTemplateStore();
	const { transformer } = useTransformerStore();
	const { handleTransformEnd } = useTransform();
	const [imageSource] = useImage(variant.src || "", "anonymous");
	const imageRef = useRef(null);

	const handleClick = (e) => {
		if (!transformer) return;
		if (!imageRef.current) return;
		const nodes = transformer.nodes();
		if (nodes.includes(imageRef.current)) {
			transformer.nodes(nodes.filter((node) => node !== imageRef.current));
			imageRef.current.setDraggable(false);
			return;
		}
		imageRef.current.setDraggable(true);
		transformer.nodes([imageRef.current]);
	};

	useEffect(() => {
		const templateLayer = template.layers
			.find((_layer) => _layer.name === layerName)
			.children[0].variants.find((_variant) => _variant.src === variant.src);
		if (templateLayer.clientRect) {
			console.log("Image is transformed");
			return;
		}
		if (imageRef.current && imageSource) {
			const img = imageRef.current;
			const parent = img.getParent();
			if (parent) {
				const parentWidth = parent.width ? parent.width() : parent.getAttrs().width;
				const parentHeight = parent.height ? parent.height() : parent.getAttrs().height;
				const imgWidth = imageSource.width;
				const imgHeight = imageSource.height;
				const width = parentWidth;
				const height = imgHeight * (parentWidth / imgWidth);
				const x = 0;
				const y = (parentHeight - height) / 2;
				console.log(width, height);
				img.setAttrs({ x, y, width, height });
				img.getStage().batchDraw();
			}
		}
	}, [visible, imageSource]);

	return <Image ref={imageRef} image={imageSource} onClick={handleClick} onDragEnd={handleTransformEnd} visible={visible} />;
};
