import { useRendererStore } from "@/app/stores/RendererStore";
import { Box, FormControlLabel, Stack, Switch, Typography } from "@mui/material";

/**
 * Display tab — editor-only preferences that don't belong to the template.
 *
 * Currently exposes the renderer toggle (legacy `LayerView` family vs the new
 * `SceneRendererView`). The flag also accepts URL overrides via `?scene=1` /
 * `?scene=0`, which are read once on first load by `RendererStore`.
 */
export default function DisplayTab() {
  const useSceneRenderer = useRendererStore((s) => s.useSceneRenderer);
  const setUseSceneRenderer = useRendererStore((s) => s.setUseSceneRenderer);

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Stack gap={0.5}>
        <FormControlLabel
          control={
            <Switch
              checked={useSceneRenderer}
              onChange={(e) => setUseSceneRenderer(e.target.checked)}
            />
          }
          label="Use scene renderer (preview)"
        />
        <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
          Renders the canvas from the new scene model instead of the legacy
          template tree. Behavior should match for shipped templates; new node
          types may render only here. Persists across reloads.
        </Typography>
      </Stack>
    </Box>
  );
}
