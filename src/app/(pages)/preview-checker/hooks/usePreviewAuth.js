import { useEffect, useState } from "react";

export function usePreviewAuth() {
  const [authToken, setAuthToken] = useState(null);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    const storedToken = typeof window !== "undefined" ? window.localStorage.getItem("previewCheckerToken") : null;
    if (storedToken) {
      setAuthToken(storedToken);
    }
  }, []);

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

