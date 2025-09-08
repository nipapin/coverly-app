import { useTransform } from "@/app/hooks/useTransform";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { useTransformerStore } from "@/app/stores/TransformerStore";
import { useEffect, useRef } from "react";
import { Image } from "react-konva";
import useImage from "use-image";
import NoImageView from "./NoImageView";

export default function ImageView({ item }) {
	const { template } = useTemplateStore();
	const { transformer } = useTransformerStore();
	const { handleTransformEnd } = useTransform();
	const [imageSource] = useImage(item.src || "", "anonymous");
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
		if (!imageRef.current) return;
		const parent = imageRef.current.getParent();
		const parentWidth = parent.width();
		const parentHeight = parent.height();
		const parentAR = parentWidth / parentHeight;
		let imageWidth = imageSource.width;
		let imageHeight = imageSource.height;
		const imageAR = imageWidth / imageHeight;

		if (parentAR > imageAR) {
			imageWidth = parentWidth;
			imageHeight = imageWidth / imageAR;
		} else {
			imageHeight = parentHeight;
			imageWidth = imageHeight * imageAR;
		}
		imageRef.current.setAttrs({ src: imageSource.src });
		imageRef.current.width(imageWidth);
		imageRef.current.height(imageHeight);
		imageRef.current.offsetX((imageWidth - parentWidth) / 2);
		imageRef.current.offsetY((imageHeight - parentHeight) / 2);

		const itemLayer = template.layers.find((layer) => layer.name === item.name);
		const layerSource = itemLayer.children.find((child) => child.src === item.src);
		const layerVariant = layerSource?.variants?.find((variant) => variant.src === item.src);
		if (layerVariant) {
			imageRef.current.setAttrs(layerVariant.transform);
		}
		imageRef.current.getLayer().batchDraw();
	}, [imageSource, item.src]);

	return imageSource ? (
		<>
			<Image ref={imageRef} onClick={handleClick} image={imageSource} onDragEnd={handleTransformEnd} />
		</>
	) : (
		<NoImageView item={item} />
	);
}
