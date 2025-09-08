import { useStageStore } from "../stores/StageStore";

export function useStage() {
	const { stage } = useStageStore();

	const getLayer = (name) => {
		return stage.findOne((node) => node.name() === name);
	};

	return { getLayer };
}
