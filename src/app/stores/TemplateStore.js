import { create } from "zustand";

const HISTORY_KEY = "coverly-template-history";
const HISTORY_INDEX_KEY = "coverly-template-history-index";
const MAX_HISTORY_SIZE = 50;

const saveToHistory = (template) => {
  if (!template || typeof window === "undefined") return;

  const { thumbnail, ...templateCopy } = template;
  const historyStr = window.localStorage.getItem(HISTORY_KEY);
  const history = historyStr ? JSON.parse(historyStr) : [];
  const currentIndex = parseInt(window.localStorage.getItem(HISTORY_INDEX_KEY) || "0");

  // Удаляем все записи после текущего индекса (если мы не в конце истории)
  const newHistory = history.slice(0, currentIndex + 1);

  // Добавляем новое состояние
  newHistory.push(JSON.parse(JSON.stringify(templateCopy)));

  // Ограничиваем размер истории
  if (newHistory.length > MAX_HISTORY_SIZE) {
    newHistory.shift();
  } else {
    // Обновляем индекс
    window.localStorage.setItem(HISTORY_INDEX_KEY, (newHistory.length - 1).toString());
  }

  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
};

const initializeHistory = (template) => {
  if (!template || typeof window === "undefined") return;

  const { thumbnail, ...templateCopy } = template;
  const history = [JSON.parse(JSON.stringify(templateCopy))];
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  window.localStorage.setItem(HISTORY_INDEX_KEY, "0");
};

export const useTemplateStore = create((set, get) => ({
  template: null,
  setTemplate: (template, initial = false, save = true, saveHistory = true) => {
    if (initial) {
      // При инициализации очищаем и создаем новую историю
      initializeHistory(template);
      set({ template });
      return;
    }

    // Сохраняем в историю перед изменением (если не отключено)
    if (saveHistory && typeof window !== "undefined") {
      const historyStr = window.localStorage.getItem(HISTORY_KEY);
      const history = historyStr ? JSON.parse(historyStr) : [];
      const currentIndex = parseInt(window.localStorage.getItem(HISTORY_INDEX_KEY) || "0");

      // Если мы не в конце истории (например, после undo), удаляем все после текущего индекса
      const newHistory = history.slice(0, currentIndex + 1);

      // Добавляем новое состояние (без thumbnail)
      const { thumbnail, ...templateCopy } = template;
      newHistory.push(JSON.parse(JSON.stringify(templateCopy)));

      // Ограничиваем размер истории
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
        window.localStorage.setItem(HISTORY_INDEX_KEY, (MAX_HISTORY_SIZE - 1).toString());
      } else {
        window.localStorage.setItem(HISTORY_INDEX_KEY, (newHistory.length - 1).toString());
      }

      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    }

    // Обновляем состояние
    set({ template });

    // Сохраняем в сессию (если не отключено)
    if (save && typeof window !== "undefined") {
      const pathname = window.location.pathname;
      const sessionId = pathname.split("/").pop();
      fetch(`/api/workflow/save`, {
        method: "POST",
        body: JSON.stringify({ sessionId, template }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Saved template to session", data);
        });
    }
  },
}));
