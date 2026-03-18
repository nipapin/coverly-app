import { useEffect, useState } from "react";

const INITIAL_RULES = [
  "Yellow + Blue/Light Blue next to each other (ONLY on clothes/objects. IGNORE neon/gradient backgrounds).",
  "Yellow clothing on characters.",
  "Social media/messenger logos (Facebook, Instagram, TikTok, VK, Twitter, Telegram, WhatsApp, etc.).",
  "Paper airplane icons or illustrations (ANY paper airplane resembling the Telegram logo is strictly forbidden, even as a faint doodle in the background).",
  'Unnecessary text inside the illustration (e.g., signs or stickers saying "STOP", "TICKET", "VIP", etc.).',
  "Faded, washed-out, or overly dark images (preview must be bright and contrasted).",
  "Unclear or confusing subjects/drawings.",
  "Weapons of any kind (firearms, knives, etc.).",
  "Smoking, cigarettes, vapes.",
  "Alcohol, bottles, glasses.",
  "Skulls, bones, skeletons.",
  "Medical items (syringes, pills, scalpels, organs).",
  "Violence, cruelty.",
  "Balaclavas/ski masks on people.",
  "State flags or coats of arms.",
  "Money, currency symbols, banknotes (wallets are allowed).",
  "Houses or buildings with crosses.",
];

export function usePreviewRules(authToken, onUnauthorized) {
  const [rules, setRules] = useState(INITIAL_RULES);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("edit");
  const [dialogValue, setDialogValue] = useState("");
  const [dialogIndex, setDialogIndex] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const notifyUnauthorized = () => {
    if (typeof onUnauthorized === "function") {
      onUnauthorized();
    }
  };

  const saveRules = async (nextRules) => {
    if (!authToken) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/preview-checker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ rules: nextRules }),
      });

      if (res.status === 401) {
        notifyUnauthorized();
        setSaveError("Сессия истекла, войдите заново.");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Ошибка сохранения правил");
      }

      setSaveSuccess(true);
    } catch (e) {
      setSaveError(e?.message || "Ошибка сохранения правил");
    } finally {
      setIsSaving(false);
    }
  };

  const loadRules = async (token) => {
    setIsLoadingRules(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/preview-checker", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        notifyUnauthorized();
        setLoadError("Сессия истекла, войдите заново.");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Не удалось загрузить правила");
      }

      const data = await res.json();
      if (Array.isArray(data?.rules)) {
        setRules(data.rules);
        setSelectedIndex(0);
      }
    } catch (e) {
      setLoadError(e?.message || "Не удалось загрузить правила");
    } finally {
      setIsLoadingRules(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      loadRules(authToken);
    }
  }, [authToken]);

  const openCreateDialog = () => {
    setDialogMode("create");
    setDialogValue("");
    setDialogIndex(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (index) => {
    setDialogMode("edit");
    setDialogIndex(index);
    setDialogValue(rules[index] ?? "");
    setIsDialogOpen(true);
  };

  const handleDialogSave = async () => {
    const trimmed = dialogValue.trim();
    if (!trimmed) return;

    if (dialogMode === "edit" && dialogIndex !== null) {
      const nextRules = rules.map((r, i) => (i === dialogIndex ? trimmed : r));
      setRules(nextRules);
      await saveRules(nextRules);
      setSelectedIndex(dialogIndex);
    } else if (dialogMode === "create") {
      const nextRules = [...rules, trimmed];
      setRules(nextRules);
      await saveRules(nextRules);
      setSelectedIndex(nextRules.length - 1);
    }

    setIsDialogOpen(false);
  };

  const handleDeleteRule = async (index) => {
    const nextRules = rules.filter((_, i) => i !== index);
    setRules(nextRules);
    await saveRules(nextRules);

    if (index === selectedIndex) {
      const nextIndex = index === 0 ? 0 : index - 1;
      setSelectedIndex(nextIndex);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
  };

  const closeSaveSuccess = () => setSaveSuccess(false);
  const closeSaveError = () => setSaveError(null);

  return {
    rules,
    selectedIndex,
    isLoadingRules,
    loadError,
    isDialogOpen,
    dialogMode,
    dialogValue,
    isSaving,
    saveError,
    saveSuccess,
    setSelectedIndex,
    setDialogValue,
    openCreateDialog,
    openEditDialog,
    handleDialogSave,
    handleDeleteRule,
    closeDialog,
    closeSaveSuccess,
    closeSaveError,
  };
}

