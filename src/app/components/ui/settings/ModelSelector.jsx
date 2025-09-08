import { useModelStore } from "@/app/stores/ModelStore";
import { MenuItem, Select } from "@mui/material";

export default function ModelSelector() {
  const { model, setModel } = useModelStore();
  return (
    <Select fullWidth size="small" value={model} onChange={(e) => setModel(e.target.value)}>
      <MenuItem value="flux">FLUX</MenuItem>
      <MenuItem value="gemini">GEMINI</MenuItem>
    </Select>
  );
}
