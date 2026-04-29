import { useStageStore } from "@/app/stores/StageStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { SwapHoriz } from "@mui/icons-material";
import { Box, Button } from "@mui/material";
import { useMemo, useState } from "react";
import ImageCard from "./ImageCard";

// `ModelSelector` is intentionally hidden while only one generation backend
// (Gemini) is wired up — a single-option dropdown just confuses users.
// Re-import and drop back into the JSX below once a second model ships.

/** Indices of top-level layers that contain at least one image child. */
function imageGroupIndices(layers) {
  if (!Array.isArray(layers)) return [];
  const out = [];
  for (let i = 0; i < layers.length; i++) {
    if (layers[i]?.children?.some((c) => c.type === "image")) out.push(i);
  }
  return out;
}

export default function ImagesTab() {
  const { stage } = useStageStore();
  const { template, setTemplate } = useTemplateStore();
  const [swapImages, setSwapImages] = useState(false);

  const layers = useMemo(() => {
    if (!template?.layers) return [];
    return template.layers
      .filter((layer) => layer.children?.some((child) => child.type === "image"))
      .flatMap((layer) => layer.children.filter((child) => child.type === "image"));
  }, [template]);

  const handleSwapImages = () => {
    setSwapImages((v) => !v);
    const all = template.layers;
    const idx = imageGroupIndices(all);
    if (idx.length < 2) return;
    const [i0, i1] = idx;
    const layerA = all[i0];
    const layerB = all[i1];
    // Swap each group's children at their original stack positions (do not move
    // non-image layers). Image child `name` follows the slot (layer name).
    const childrenIntoA = layerB.children.map((child) =>
      child.type === "image" ? { ...child, name: layerA.name } : child,
    );
    const childrenIntoB = layerA.children.map((child) =>
      child.type === "image" ? { ...child, name: layerB.name } : child,
    );
    const newLayers = all.map((layer, i) => {
      if (i === i0) return { ...layerA, children: childrenIntoA };
      if (i === i1) return { ...layerB, children: childrenIntoB };
      return layer;
    });
    setTemplate({ ...template, layers: newLayers });
    stage.batchDraw();
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      gap="0.5rem"
      minHeight="0"
      overflow="auto"
      sx={{
        "&::-webkit-scrollbar": { width: "10px" },
        "&::-webkit-scrollbar-track": { background: "#13315C" },
        "&::-webkit-scrollbar-thumb": { background: "white", borderRadius: "0.5rem", border: "4px solid #13315C" },
      }}
    >
      {layers.length > 1 && (
        <Button variant="outlined" color="primary" startIcon={<SwapHoriz />} onClick={handleSwapImages}>
          Swap Images
        </Button>
      )}
      <Box display="flex" flexDirection="column" gap="0.5rem">
        {swapImages
          ? layers.reverse().map((layer) => <ImageCard key={layer.name} layer={layer} />)
          : layers.map((layer) => <ImageCard key={layer.name} layer={layer} />)}
      </Box>
    </Box>
  );
}
