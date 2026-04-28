import { useModelStore } from "@/app/stores/ModelStore";
import { MenuItem, Select } from "@mui/material";

export default function ModelSelector() {
  const { model, setModel } = useModelStore();
  return (
    <Select fullWidth size="small" value={model} onChange={(e) => setModel(e.target.value)}>
      {/* FLUX intentionally omitted: requires a ComfyUI/Replicate backend that
          isn't wired up in this environment (see src/app/api/generate/flux). */}
      <MenuItem value="gemini">GEMINI</MenuItem>
    </Select>
  );
}
