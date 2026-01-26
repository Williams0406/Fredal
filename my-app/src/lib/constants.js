// src/lib/constants.js

export const ACCESS_TOKEN_KEY = "access_token";
export const REFRESH_TOKEN_KEY = "refresh_token";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* =========================
   ROLES
========================= */

export const ROLES = {
  TECNICO: "Tecnico",
  JEFE_TECNICOS: "Jefe de Tecnicos",
  ALMACENERO: "Almacenero",
  JEFE_ALMACEN: "Jefe de Almaceneros",
  MANAGE_COMPRAS: "ManageCompras",
};
