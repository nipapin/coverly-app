import { useFontLoader } from "../hooks/useFonts";
import { useStageStore } from "../stores/StageStore";
import GuidelinesView from "./canvas/GuidelinesView";
import MainStage from "./canvas/MainStage";
import TemplateView from "./canvas/TemplateView";
import TransformerView from "./canvas/TransformerView";
import Droplets from "./Droplets";
import Overlay from "./ui/Overlay";

export default function MainCanvas() {
  const { stage } = useStageStore();
  // Boot fonts globally — independent of which Settings tab is open.
  // Without this, Konva renders text with the system fallback until the
  // user happens to open the Texts tab (which used to be the only place
  // that loaded `template.fonts` into `document.fonts`).
  useFontLoader();
  return (
    <>
      <MainStage>
        <TemplateView />
        <TransformerView />
        <GuidelinesView />
      </MainStage>
      {stage && <Droplets />}
      {stage && <Overlay />}
    </>
  );
}
