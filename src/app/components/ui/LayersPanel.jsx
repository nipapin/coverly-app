import { useLayersUiStore } from "@/app/stores/LayersUiStore";
import { useSelectionStore } from "@/app/stores/SelectionStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { NODE_KINDS } from "@/lib/scene";
import {
  Add,
  CropSquare,
  Delete,
  ExpandLess,
  ExpandMore,
  Image as ImageIcon,
  Lock,
  LockOpen,
  PhotoSizeSelectActual,
  TextFields,
  ViewModule,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { Box, Button, IconButton, Menu, MenuItem, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { useEffect, useState } from "react";

const NAVIGATION_WIDTH = 80;
const PANEL_WIDTH = 240;
const TOP_OFFSET = 16;

const KIND_META = {
  [NODE_KINDS.frame]: { icon: ViewModule, label: "Frame" },
  [NODE_KINDS.image]: { icon: ImageIcon, label: "Image" },
  [NODE_KINDS.shape]: { icon: CropSquare, label: "Shape" },
  [NODE_KINDS.text]: { icon: TextFields, label: "Text" },
  [NODE_KINDS.asset]: { icon: PhotoSizeSelectActual, label: "Asset" },
};

/**
 * Left-side flat tree of every node in the scene. Provides:
 *   - click to select (Shift/Cmd to extend, like the canvas)
 *   - eye toggle to hide a node from the renderer (LayersUiStore.hidden)
 *   - lock toggle to forbid selecting it on the canvas (LayersUiStore.locked)
 *   - collapse for frames so dense templates stay readable
 *
 * Reads `scene` directly from `TemplateStore` (derived in Phase 0). When the
 * scene is empty (e.g. before the workflow loads) the panel hides itself.
 */
export default function LayersPanel() {
  const scene = useTemplateStore((s) => s.scene);
  const addShape = useTemplateStore((s) => s.addShape);
  const addText = useTemplateStore((s) => s.addText);
  const removeNodeById = useTemplateStore((s) => s.removeNodeById);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const clearSelection = useSelectionStore((s) => s.clear);
  const [menuAnchor, setMenuAnchor] = useState(null);

  // Keyboard delete: drop every selected node, then clear selection because
  // path-based ids of *later* layers shift after a removal (see
  // TemplateStore.removeNodeById doc).
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const t = e.target;
      const tag = t?.tagName?.toLowerCase();
      // Don't intercept when the user is typing.
      if (tag === "input" || tag === "textarea" || t?.isContentEditable) return;
      if (selectedIds.length === 0) return;
      e.preventDefault();
      for (const id of selectedIds) removeNodeById(id);
      clearSelection();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIds, removeNodeById, clearSelection]);

  if (!scene || !Array.isArray(scene.nodes) || scene.nodes.length === 0) {
    return null;
  }

  const handleAdd = (kind) => {
    setMenuAnchor(null);
    if (kind === "shape") addShape();
    else if (kind === "text") addText();
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        position: "absolute",
        top: TOP_OFFSET,
        left: NAVIGATION_WIDTH + TOP_OFFSET,
        zIndex: 1000,
        width: PANEL_WIDTH,
        maxHeight: `calc(100vh - ${TOP_OFFSET * 2}px)`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        px={1.5}
        py={0.75}
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="overline" fontWeight={700}>
          Layers
        </Typography>
        <Button
          size="small"
          startIcon={<Add fontSize="small" />}
          onClick={(e) => setMenuAnchor(e.currentTarget)}
        >
          Add
        </Button>
        <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
          <MenuItem onClick={() => handleAdd("shape")}>
            <CropSquare fontSize="small" sx={{ mr: 1 }} /> Shape
          </MenuItem>
          <MenuItem onClick={() => handleAdd("text")}>
            <TextFields fontSize="small" sx={{ mr: 1 }} /> Text
          </MenuItem>
        </Menu>
      </Box>
      <Box sx={{ overflowY: "auto" }}>
        <Stack divider={<Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />}>
          {scene.nodes.map((node) => (
            <LayerRow key={node.id} node={node} depth={0} onDelete={removeNodeById} />
          ))}
        </Stack>
      </Box>
    </Paper>
  );
}

function LayerRow({ node, depth, onDelete }) {
  const [expanded, setExpanded] = useState(true);
  const meta = KIND_META[node.kind] ?? { icon: CropSquare, label: node.kind };
  const Icon = meta.icon;
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;

  const isSelected = useSelectionStore((s) => s.selectedIds.includes(node.id));
  const select = useSelectionStore((s) => s.select);
  const toggleSelection = useSelectionStore((s) => s.toggleSelection);
  const clearSelection = useSelectionStore((s) => s.clear);

  const isHidden = useLayersUiStore((s) => !!s.hidden[node.id]);
  const isLocked = useLayersUiStore((s) => !!s.locked[node.id]);
  const toggleHidden = useLayersUiStore((s) => s.toggleHidden);
  const toggleLocked = useLayersUiStore((s) => s.toggleLocked);

  const label = node.legacyName || node.name || meta.label;

  const handleClick = (e) => {
    if (isLocked) return;
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      toggleSelection(node.id);
    } else {
      select(node.id);
    }
  };

  return (
    <Box>
      <Box
        onClick={handleClick}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 1,
          py: 0.75,
          cursor: isLocked ? "not-allowed" : "pointer",
          backgroundColor: isSelected ? "action.selected" : "transparent",
          opacity: isHidden ? 0.5 : 1,
          "&:hover": { backgroundColor: isSelected ? "action.selected" : "action.hover" },
        }}
      >
        <Box sx={{ width: depth * 14, flexShrink: 0 }} />
        {hasChildren ? (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            sx={{ p: 0.25 }}
          >
            {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
        ) : (
          <Box sx={{ width: 24, flexShrink: 0 }} />
        )}
        <Icon fontSize="small" sx={{ opacity: 0.7 }} />
        <Typography variant="body2" noWrap sx={{ flex: 1, fontWeight: isSelected ? 600 : 400 }}>
          {label}
        </Typography>
        <Tooltip title={isHidden ? "Show" : "Hide"} arrow>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              toggleHidden(node.id);
            }}
            sx={{ p: 0.25 }}
          >
            {isHidden ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title={isLocked ? "Unlock" : "Lock"} arrow>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              toggleLocked(node.id);
            }}
            sx={{ p: 0.25 }}
          >
            {isLocked ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
          </IconButton>
        </Tooltip>
        {typeof onDelete === "function" && (
          <Tooltip title="Delete" arrow>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                if (onDelete(node.id)) clearSelection();
              }}
              sx={{ p: 0.25 }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {hasChildren && expanded && (
        <Box>
          {node.children.map((child) => (
            <LayerRow key={child.id} node={child} depth={depth + 1} onDelete={onDelete} />
          ))}
        </Box>
      )}
    </Box>
  );
}
