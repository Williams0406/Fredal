// src/lib/auth.js

import { authAPI } from "./api";

/* =========================
   AUTH HELPERS
========================= */

export const login = async (username, password) => {
  return authAPI.login(username, password);
};

export const logout = () => {
  authAPI.logout();
};

export const getMe = async () => {
  return authAPI.me();
};
