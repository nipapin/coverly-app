import { usePresetsStore } from "@/app/stores/PresetsStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Delete, Save } from "@mui/icons-material";
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

/**
 * Presets tab in the right Settings panel.
 *
 * - Save: snapshots the current `template` into `localStorage`. Naming is
 *   optional — empty falls back to "Preset N".
 * - Apply: replaces the current template via `setTemplate`. The scene will
 *   be re-derived (see `TemplateStore.deriveSceneFromTemplate`) and the
 *   canvas updates automatically.
 * - Delete: removes the entry from the store and disk.
 *
 * Phase 4 deliberately keeps this MVP-shaped. Folders, thumbnails and
 * preview-on-hover are deferred until the editor stabilizes.
 */
export default function PresetsTab() {
  const { template, setTemplate } = useTemplateStore();
  const presets = usePresetsStore((s) => s.presets);
  const loaded = usePresetsStore((s) => s.loaded);
  const load = usePresetsStore((s) => s.load);
  const savePreset = usePresetsStore((s) => s.savePreset);
  const deletePreset = usePresetsStore((s) => s.deletePreset);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const handleSave = () => {
    if (!template) return;
    const created = savePreset(name, template);
    if (created) setName("");
  };

  const handleApply = (preset) => {
    if (!preset?.template) return;
    setTemplate(preset.template);
  };

  return (
    <Box display="flex" flexDirection="column" gap={1.5} minHeight={0}>
      <Stack direction="row" gap={1} alignItems="center">
        <TextField
          size="small"
          fullWidth
          placeholder={`Preset name (e.g. "${presets.length + 1}-image dark")`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
        />
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={!template}
        >
          Save
        </Button>
      </Stack>
      {presets.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No presets yet. Save the current template to start a library — they
          live in your browser only.
        </Typography>
      ) : (
        <Box sx={{ overflowY: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
          <List dense disablePadding>
            {presets.map((preset) => (
              <ListItem
                key={preset.id}
                divider
                secondaryAction={
                  <Stack direction="row" gap={0.5}>
                    <Button size="small" variant="outlined" onClick={() => handleApply(preset)}>
                      Apply
                    </Button>
                    <Tooltip title="Delete" arrow>
                      <IconButton size="small" edge="end" onClick={() => deletePreset(preset.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                }
              >
                <ListItemText
                  primary={preset.name}
                  secondary={new Date(preset.createdAt).toLocaleString()}
                  primaryTypographyProps={{ noWrap: true }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
}
