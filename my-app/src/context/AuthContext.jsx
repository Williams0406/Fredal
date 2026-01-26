// src/context/AuthContext.jsx

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getMe, logout } from "@/lib/auth";
import { ACCESS_TOKEN_KEY } from "@/lib/constants";
import { login as loginRequest } from "@/lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* =========================
     CARGAR USUARIO
  ========================= */

  const loadUser = async () => {
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(ACCESS_TOKEN_KEY)
          : null;

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const me = await getMe();
      setUser(me);

    } catch (error) {
      console.error("Error cargando usuario:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     INIT
  ========================= */

  useEffect(() => {
    loadUser();
  }, []);

  /* =========================
    LOGIN
  ========================= */

  const login = async (username, password) => {
    setLoading(true);
    try {
      await loginRequest(username, password); // ya guarda tokens
      await loadUser();
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     CONTEXT VALUE
  ========================= */

  const value = {
    user,
    roles: user?.roles || [],
    trabajador: user?.trabajador || null,
    loading,
    isAuthenticated: !!user,
    reloadUser: loadUser,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/* =========================
   HOOK
========================= */

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      "useAuth debe usarse dentro de <AuthProvider>"
    );
  }
  return context;
}
