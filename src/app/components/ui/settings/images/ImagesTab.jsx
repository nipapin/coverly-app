import { useStageStore } from "@/app/stores/StageStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { SwapHoriz } from "@mui/icons-material";
import { Box, Button } from "@mui/material";
import { useEffect, useState } from "react";
import ModelSelector from "../ModelSelector";
import ImageCard from "./ImageCard";

export default function ImagesTab() {
  const { stage } = useStageStore();
  const { template, setTemplate } = useTemplateStore();
  const [swapImages, setSwapImages] = useState(false);
  const [layers, setLayers] = useState([]);

  const handleSwapImages = () => {
    setSwapImages(!swapImages);
    const layers = template.layers;
    const [imageLayer1, imageLayer2] = layers.filter((layer) => layer.children?.some((child) => child.type === "image"));
    const newImageLayer1 = { ...imageLayer1, children: imageLayer2.children.map((child) => ({ ...child, name: imageLayer1.name })) };
    const newImageLayer2 = { ...imageLayer2, children: imageLayer1.children.map((child) => ({ ...child, name: imageLayer2.name })) };
    const otherLayers = layers.filter((layer) => !layer.children?.some((child) => child.type === "image"));
    const newLayers = [newImageLayer1, newImageLayer2, ...otherLayers];
    setTemplate({ ...template, layers: newLayers });
    stage.batchDraw();
  };

  useEffect(() => {
    const imageLayers = template.layers
      .filter((layer) => layer.children?.some((child) => child.type === "image"))
      .flatMap((layer) => layer.children);
    setLayers(imageLayers);
  }, [template]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      gap="0.5rem"
      minHeight="0"
      overflow="auto"
      sx={{
        "&::-webkit-scrollbar": { width: "10px" },
        "&::-webkit-scrollbar-track": { backgroundh: "#13315C" },
        "&::-webkit-scrollbar-thumb": { background: "white", borderRadius: "0.5rem", border: "4px solid #13315C" },
      }}
    >
      <ModelSelector />
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
