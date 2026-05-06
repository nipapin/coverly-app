import { useAssetsStore } from "@/app/stores/AssetsStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Box, Collapse, MenuItem, Select, Stack, Switch, Typography } from "@mui/material";

export default function AssetsTab() {
  const { template, setTemplate } = useTemplateStore();
  const { flipX, flipY, setFlipX, setFlipY } = useAssetsStore();
  const { selectedAsset, setSelectedAsset } = useAssetsStore();
  const assetsVariants = template.assetsVariants;
  const allowFlip = template.allowFlip;

  const handleChangeSelectedAsset = (e) => {
    setSelectedAsset(e.target.value);
    setTemplate({ ...template, selectedAsset: e.target.value });
  };

  const handleChangeFlipX = (e) => {
    setFlipX(e.target.checked);
    setTemplate({ ...template, flipX: e.target.checked });
  };

  const handleChangeFlipY = (e) => {
    setFlipY(e.target.checked);
    setTemplate({ ...template, flipY: e.target.checked });
  };

  return (
    <Box display="flex" flexDirection="column" gap="0.5rem">
      <Typography variant="h6">Assets Variants</Typography>
      <Select size="small" fullWidth value={selectedAsset} onChange={handleChangeSelectedAsset}>
        {assetsVariants.map((variant, index) => (
          <MenuItem key={index} value={index}>
            {variant.toUpperCase()}
          </MenuItem>
        ))}
      </Select>
      <Typography variant="caption" color="text.secondary">
        Move stickers on the canvas by dragging them when selected.
      </Typography>
      <Collapse in={allowFlip}>
        <Stack direction={"column"} gap="0.5rem">
          <Stack direction={"row"} alignItems={"center"} justifyContent={"space-between"}>
            <Typography>Flip X</Typography>
            <Switch checked={flipX} onChange={handleChangeFlipX} />
          </Stack>
          <Stack direction={"row"} alignItems={"center"} justifyContent={"space-between"}>
            <Typography>Flip Y</Typography>
            <Switch checked={flipY} onChange={handleChangeFlipY} />
          </Stack>
        </Stack>
      </Collapse>
    </Box>
  );
}
