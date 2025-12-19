import { useStageStore } from "../stores/StageStore";
import MainStage from "./canvas/MainStage";
import TemplateView from "./canvas/TemplateView";
import TransformerView from "./canvas/TransformerView";
import Droplets from "./Droplets";
import Overlay from "./ui/Overlay";

export default function MainCanvas() {
  const { stage } = useStageStore();
  return (
    <>
      <MainStage>
        <TemplateView />
        <TransformerView />
      </MainStage>
      {stage && <Droplets />}
      {stage && <Overlay />}
    </>
  );
}
