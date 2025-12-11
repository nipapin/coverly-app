import { useAssetsStore } from "@/app/stores/AssetsStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Box, Collapse, FormControlLabel, MenuItem, Select, Slider, Stack, Switch, Typography } from "@mui/material";
import { useRef, useState } from "react";

const marks = [
  {
    value: 0,
    label: "Start",
  },
  {
    value: 50,
    label: "Middle",
  },
  {
    value: 100,
    label: "End",
  },
];

export default function AssetsTab() {
  const { template, setTemplate } = useTemplateStore();
  const { flipX, flipY, setFlipX, setFlipY } = useAssetsStore();
  const { position, selectedAsset, setPosition, setSelectedAsset } = useAssetsStore();
  const assetsVariants = template.assetsVariants;
  const allowFlip = template.allowFlip;
  const frameRef = useRef(false);

  const handleChangePosition = (e) => {
    if (frameRef.current) return;
    frameRef.current = true;
    requestAnimationFrame(() => {
      setPosition(e.target.value / 100);
      frameRef.current = false;
    });
  };
  const handleChangeCommittedPosition = (e, newValue) => {
    if (frameRef.current) return;
    frameRef.current = true;
    requestAnimationFrame(() => {
      setPosition(newValue / 100);
      setTemplate({ ...template, position: newValue / 100 });
      frameRef.current = false;
    });
  };

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
      <Typography variant="h6">Assets Position</Typography>
      <Slider
        step={10}
        marks
        min={0}
        max={100}
        value={position * 100}
        onChange={handleChangePosition}
        onChangeCommitted={handleChangeCommittedPosition}
        size="small"
      />
      <Collapse in={allowFlip}>
        <Stack direction={"column"} gap="0.5rem">
          <Stack direction={"row"} alignItems="center" justifyContent="space-between">
            <Typography>Flip X</Typography>
            <Switch checked={flipX} onChange={handleChangeFlipX} />
          </Stack>
          <Stack direction={"row"} alignItems="center" justifyContent="space-between">
            <Typography>Flip Y</Typography>
            <Switch checked={flipY} onChange={handleChangeFlipY} />
          </Stack>
        </Stack>
      </Collapse>
    </Box>
  );
}
