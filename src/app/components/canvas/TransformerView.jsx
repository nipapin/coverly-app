import { useTransform } from "@/app/hooks/useTransform";
import { useTransformerStore } from "@/app/stores/TransformerStore";
import { useEffect, useRef } from "react";
import { Layer, Transformer } from "react-konva";

export default function TransformerView() {
	const transformerRef = useRef(null);
	const { setTransformer } = useTransformerStore();
	const { handleTransformEnd } = useTransform();

	useEffect(() => {
		if (!transformerRef.current) return;
		setTransformer(transformerRef.current);
		transformerRef.current?.on("transformend", handleTransformEnd);
		return () => {
			transformerRef.current?.off("transformend", handleTransformEnd);
		};
	}, []);

	return (
		<Layer name='TransformerView'>
			<Transformer ref={transformerRef} onTransformEnd={handleTransformEnd} />
		</Layer>
	);
}
