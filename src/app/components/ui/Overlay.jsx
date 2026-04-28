import LayersPanel from "./LayersPanel";
import Navigation from "./Navigation";
import Settings from "./settings/Settings";

export default function Overlay() {
  return (
    <>
      <Navigation />
      <LayersPanel />
      <Settings />
    </>
  );
}
