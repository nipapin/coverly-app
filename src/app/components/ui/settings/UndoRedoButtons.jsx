import { useLayersUiStore } from "@/app/stores/LayersUiStore";
import { useSelectionStore } from "@/app/stores/SelectionStore";
import { useStageStore } from "@/app/stores/StageStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Redo, Undo } from "@mui/icons-material";
import { Box, IconButton, Tooltip } from "@mui/material";
import { useCallback, useEffect, useMemo } from "react";

const HISTORY_KEY = "coverly-template-history";
const HISTORY_INDEX_KEY = "coverly-template-history-index";

/**
 * Compute the current undo/redo disabled state from localStorage. The history
 * stack lives there (see `TemplateStore.setTemplate`), so this stays the
 * single source of truth — derived directly in render via `useMemo` instead
 * of mirrored into React state through an effect.
 */
function readHistoryCursor() {
  if (typeof window === "undefined") {
    return { undoDisabled: true, redoDisabled: true };
  }
  const historyIndex = parseInt(window.localStorage.getItem(HISTORY_INDEX_KEY) || "0");
  const historyStr = window.localStorage.getItem(HISTORY_KEY);
  const history = historyStr ? JSON.parse(historyStr) : [];
  return {
    undoDisabled: historyIndex <= 0 || history.length === 0,
    redoDisabled: historyIndex >= history.length - 1 || history.length === 0,
  };
}

export default function UndoRedoButtons() {
  const { stage } = useStageStore();
  const { template, setTemplate } = useTemplateStore();
  const clearSelection = useSelectionStore((s) => s.clear);
  const resetLayersUi = useLayersUiStore((s) => s.reset);

  // `template` changes on every history mutation (push/undo/redo) — that's
  // exactly when we want to re-read the cursor — so memoizing on it is enough.
  // The lint can't tell the dep is intentional because the cursor lives in
  // localStorage, not in `template` directly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { undoDisabled, redoDisabled } = useMemo(() => readHistoryCursor(), [template]);

  const handleUndo = useCallback(() => {
    if (typeof window === "undefined") return;

    const historyIndex = parseInt(window.localStorage.getItem(HISTORY_INDEX_KEY) || "0");
    const historyStr = window.localStorage.getItem(HISTORY_KEY);
    const history = historyStr ? JSON.parse(historyStr) : [];

    if (historyIndex <= 0 || history.length === 0) {
      return;
    }

    const newIndex = historyIndex - 1;
    const { thumbnail } = template || {};
    const historyState = history[newIndex];
    if (!historyState) {
      console.error("History state not found at index", newIndex);
      return;
    }

    window.localStorage.setItem(HISTORY_INDEX_KEY, newIndex.toString());

    const newTemplate = JSON.parse(JSON.stringify({ ...historyState, thumbnail }));
    // Path-based ids may shift if the user added/removed layers between
    // snapshots; clearing selection avoids pointing at the wrong slot. The
    // Layers panel UI overlay (visibility / locks) is also tied to ids so we
    // reset it for the same reason.
    clearSelection();
    resetLayersUi();
    // save=true persists the undone state to the backend so a refresh keeps
    // the user where the undo left them. saveHistory=false because the entry
    // already lives in the history stack — we just navigated to it.
    setTemplate(newTemplate, false, true, false);

    // Konva keeps a separate render tree from React; nudge it after the state
    // commit so the canvas reflects the restored template immediately.
    requestAnimationFrame(() => {
      if (stage) {
        const layers = stage.getLayers();
        layers.forEach((layer) => {
          layer.batchDraw();
        });
        stage.batchDraw();
      }
    });
  }, [template, setTemplate, stage, clearSelection, resetLayersUi]);

  const handleRedo = useCallback(() => {
    if (typeof window === "undefined") return;

    const historyIndex = parseInt(window.localStorage.getItem(HISTORY_INDEX_KEY) || "0");
    const historyStr = window.localStorage.getItem(HISTORY_KEY);
    const history = historyStr ? JSON.parse(historyStr) : [];

    if (historyIndex >= history.length - 1 || history.length === 0) {
      return;
    }

    const newIndex = historyIndex + 1;
    const { thumbnail } = template || {};
    const historyState = history[newIndex];

    if (!historyState) {
      console.error("History state not found at index", newIndex);
      return;
    }

    window.localStorage.setItem(HISTORY_INDEX_KEY, newIndex.toString());

    const newTemplate = JSON.parse(JSON.stringify({ ...historyState, thumbnail }));
    // See handleUndo: clear selection / layer UI overlay so they don't dangle
    // on stale ids when the topology changes between snapshots.
    clearSelection();
    resetLayersUi();
    // See handleUndo: persist redone state to backend, but don't push it onto
    // the history stack since that's where it already came from.
    setTemplate(newTemplate, false, true, false);

    requestAnimationFrame(() => {
      if (stage) {
        const layers = stage.getLayers();
        layers.forEach((layer) => {
          layer.batchDraw();
        });
        stage.batchDraw();
      }
    });
  }, [template, setTemplate, stage, clearSelection, resetLayersUi]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) {
        return;
      }

      if (e.ctrlKey && e.key === "z" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (!undoDisabled) {
          handleUndo();
        }
      }
      if ((e.ctrlKey && e.key === "y" && !e.shiftKey) || (e.ctrlKey && e.shiftKey && e.key === "z")) {
        e.preventDefault();
        if (!redoDisabled) {
          handleRedo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoDisabled, redoDisabled, handleUndo, handleRedo]);

  return (
    <Box display={"flex"} gap={"0.5rem"}>
      <Tooltip title="Undo (Ctrl+Z)">
        <IconButton disabled={undoDisabled} onClick={handleUndo} size="small">
          <Undo />
        </IconButton>
      </Tooltip>
      <Tooltip title="Redo (Ctrl+Y)">
        <IconButton disabled={redoDisabled} onClick={handleRedo} size="small">
          <Redo />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
