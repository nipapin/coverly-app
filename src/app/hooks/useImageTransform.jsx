import { useStageStore } from "../stores/StageStore";

export const useImageTransform = ({ layer }) => {
	const { stage } = useStageStore();
	const alignHorizontalCenter = () => {
		console.log(layer);
		const canvasLayer = stage.findOne((node) => node.name() === layer.name);
		const layerSource = canvasLayer.children[0];
		console.log(canvasLayer.getAbsolutePosition(canvasLayer));
		console.log(layerSource.getAbsolutePosition(canvasLayer));
	};

	const alignVerticalCenter = () => {
		console.log(layer);
	};
	const fitVertical = () => {
		console.log(layer);
	};
	const fitHorizontal = () => {
		console.log(layer);
	};
	return {
		alignHorizontalCenter,
		alignVerticalCenter,
		fitVertical,
		fitHorizontal
	};
};
