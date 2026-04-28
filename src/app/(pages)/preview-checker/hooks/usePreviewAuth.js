import { useState } from "react";

const readStoredToken = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("previewCheckerToken");
  } catch {
    return null;
  }
};

export function usePreviewAuth() {
  // Lazy init pulls the persisted token in synchronously instead of bouncing
  // through `useEffect` + `setAuthToken`, which the React 19 hooks linter
  // (rightly) flags as a wasted commit.
  const [authToken, setAuthToken] = useState(readStoredToken);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const logout = () => {
    setAuthToken(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("previewCheckerToken");
    }
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/preview-checker/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ login, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Ошибка авторизации");
      }

      const data = await res.json();
      const token = data?.token;
      if (typeof token !== "string") {
        throw new Error("Некорректный ответ сервера");
      }

      setAuthToken(token);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("previewCheckerToken", token);
      }
      setLogin("");
      setPassword("");
    } catch (e) {
      setAuthError(e?.message || "Ошибка авторизации");
    } finally {
      setIsAuthLoading(false);
    }
  };

  return {
    authToken,
    login,
    password,
    authError,
    isAuthLoading,
    setLogin,
    setPassword,
    handleLoginSubmit,
    logout,
  };
}

