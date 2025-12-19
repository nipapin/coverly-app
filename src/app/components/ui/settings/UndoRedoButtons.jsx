import { useStageStore } from "@/app/stores/StageStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Redo, Undo } from "@mui/icons-material";
import { Box, IconButton, Tooltip } from "@mui/material";
import { useCallback, useEffect, useState } from "react";

const HISTORY_KEY = "coverly-template-history";
const HISTORY_INDEX_KEY = "coverly-template-history-index";

export default function UndoRedoButtons() {
  const { stage } = useStageStore();
  const { template, setTemplate } = useTemplateStore();
  const [undoDisabled, setUndoDisabled] = useState(true);
  const [redoDisabled, setRedoDisabled] = useState(true);

  const updateButtonsState = () => {
    const historyIndex = parseInt(window.localStorage.getItem(HISTORY_INDEX_KEY) || "0");
    const historyStr = window.localStorage.getItem(HISTORY_KEY);
    const history = historyStr ? JSON.parse(historyStr) : [];

    setUndoDisabled(historyIndex <= 0 || history.length === 0);
    setRedoDisabled(historyIndex >= history.length - 1 || history.length === 0);
  };

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

    // Обновляем индекс истории ПЕРЕД восстановлением состояния
    window.localStorage.setItem(HISTORY_INDEX_KEY, newIndex.toString());

    // Восстанавливаем состояние из истории и сохраняем текущий thumbnail
    // Используем глубокое копирование для правильного восстановления
    const newTemplate = JSON.parse(JSON.stringify({ ...historyState, thumbnail }));
    // saveHistory=false чтобы не добавлять undo/redo в историю
    setTemplate(newTemplate, false, false, false);

    // Принудительно обновляем все узлы Konva после восстановления состояния
    // Используем requestAnimationFrame для гарантии обновления после изменения состояния
    requestAnimationFrame(() => {
      if (stage) {
        // Обновляем все слои
        const layers = stage.getLayers();
        layers.forEach((layer) => {
          layer.batchDraw();
        });
        stage.batchDraw();
      }
    });

    // Обновляем состояние кнопок после небольшой задержки, чтобы дать время обновиться состоянию
    setTimeout(() => {
      updateButtonsState();
      if (stage) {
        stage.batchDraw();
      }
    }, 50);
  }, [template, setTemplate, stage]);

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

    // Обновляем индекс истории ПЕРЕД восстановлением состояния
    window.localStorage.setItem(HISTORY_INDEX_KEY, newIndex.toString());

    // Восстанавливаем состояние из истории и сохраняем текущий thumbnail
    // Используем глубокое копирование для правильного восстановления
    const newTemplate = JSON.parse(JSON.stringify({ ...historyState, thumbnail }));
    // saveHistory=false чтобы не добавлять undo/redo в историю
    setTemplate(newTemplate, false, false, false);

    // Принудительно обновляем все узлы Konva после восстановления состояния
    // Используем requestAnimationFrame для гарантии обновления после изменения состояния
    requestAnimationFrame(() => {
      if (stage) {
        // Обновляем все слои
        const layers = stage.getLayers();
        layers.forEach((layer) => {
          layer.batchDraw();
        });
        stage.batchDraw();
      }
    });

    // Обновляем состояние кнопок после небольшой задержки, чтобы дать время обновиться состоянию
    setTimeout(() => {
      updateButtonsState();
      if (stage) {
        stage.batchDraw();
      }
    }, 50);
  }, [template, setTemplate, stage]);

  useEffect(() => {
    updateButtonsState();
  }, [template]);

  // Добавляем обработчики горячих клавиш
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Пропускаем если пользователь вводит текст в поле ввода
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) {
        return;
      }

      // Ctrl+Z для undo
      if (e.ctrlKey && e.key === "z" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (!undoDisabled) {
          handleUndo();
        }
      }
      // Ctrl+Y или Ctrl+Shift+Z для redo
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
