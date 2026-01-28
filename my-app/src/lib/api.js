// src/lib/api.js

import axios from "axios";
import {
  API_URL,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from "./constants";

/* =========================
   TOKEN HELPERS
========================= */

const getAccessToken = () =>
  typeof window !== "undefined"
    ? localStorage.getItem(ACCESS_TOKEN_KEY)
    : null;

const getRefreshToken = () =>
  typeof window !== "undefined"
    ? localStorage.getItem(REFRESH_TOKEN_KEY)
    : null;

const setTokens = (access, refresh) => {
  if (typeof window === "undefined") return;

  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  document.cookie = `${ACCESS_TOKEN_KEY}=${access}; path=/; SameSite=Lax`;

  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    document.cookie = `${REFRESH_TOKEN_KEY}=${refresh}; path=/; SameSite=Lax`;
  }
};

const clearTokens = () => {
  if (typeof window === "undefined") return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);

  document.cookie = `${ACCESS_TOKEN_KEY}=; Max-Age=0; path=/`;
  document.cookie = `${REFRESH_TOKEN_KEY}=; Max-Age=0; path=/`;
};

/* =========================
   AXIOS INSTANCE
========================= */

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

/* =========================
   REQUEST INTERCEPTOR
========================= */

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* =========================
   RESPONSE INTERCEPTOR
========================= */

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      const refresh = getRefreshToken();
      if (!refresh) {
        clearTokens();
        window.location.href = "/";
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(
          `${API_URL}/api/token/refresh/`,
          { refresh }
        );

        const { access } = res.data;
        setTokens(access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);

      } catch {
        clearTokens();
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

/* =========================
   AUTH API
========================= */

export const authAPI = {
  login: async (username, password) => {
    const res = await axios.post(`${API_URL}/api/token/`, {
      username,
      password,
    });

    const { access, refresh } = res.data;
    setTokens(access, refresh);
    return res.data;
  },

  logout: () => {
    clearTokens();
    window.location.href = "/";
  },

  me: async () => {
    const res = await api.get("/api/me/");
    return res.data;
  },
};

/* =========================
   DOMAIN APIs (BACKEND REAL)
========================= */

export const itemAPI = {
  list: (params) => api.get("/api/items/", { params }),
  retrieve: (id) => api.get(`/api/items/${id}/`),
  create: (data) => api.post("/api/items/", data),
  update: (id, data) => api.put(`/api/items/${id}/`, data),
  delete: (id) => api.delete(`/api/items/${id}/`),

  // 📍 Ubicación actual del item
  ubicacionActual: (id) =>
    api.get(`/api/items/${id}/ubicacion_actual/`),

  // 📦 Kardex del item
  kardex: (id) =>
    api.get(`/api/items/${id}/kardex/`),

  // 📜 Historial (modal)
  historial: (id) =>
    api.get(`/api/items/${id}/historial/`),

  proveedores: (id) =>
    api.get(`/api/items/${id}/proveedores/`),

  unidadesAsignables: (itemId, params) =>
    api.get(`/api/items/${itemId}/unidades_asignables/`, { params }),

  porMaquinaria: (maquinariaId) =>
    api.get("/api/items/por_maquinaria/", {
      params: { maquinaria: maquinariaId },
    }),
  
  kardexContable: (id) =>
    api.get(`/api/items/${id}/kardex_contable/`),

  cambiarEstadoUnidad: (itemId, data) =>
    api.post(`/api/items/${itemId}/cambiar_estado_unidad/`, data),
};


export const maquinariaAPI = {
  list: () => api.get("/api/maquinarias/"),
  retrieve: (id) => api.get(`/api/maquinarias/${id}/`),
  unidades: (id) =>
    api.get(`/api/maquinarias/${id}/unidades/`),
  create: (data) => api.post("/api/maquinarias/", data),
  update: (id, data) => api.put(`/api/maquinarias/${id}/`, data),
  delete: (id) => api.delete(`/api/maquinarias/${id}/`),
};


// REGISTRO POR CÓDIGO
export const registroAPI = {
  registerWithCode: (data) =>
    axios.post(`${API_URL}/api/registro/`, data),
};

export const almacenAPI = {
  list: () => api.get("/api/almacenes/"),
};

// TRABAJADOR (ADMIN)
export const trabajadorAPI = {
  list: () => api.get("/api/trabajadores/"),
  create: (data) => api.post("/api/trabajadores/", data),
  generarCodigo: (id) =>
    api.post(`/api/trabajadores/${id}/generar_codigo/`),
};

export const trabajoAPI = {
  list: (params) => api.get("/api/trabajos/", { params }),
  retrieve: (id) => api.get(`/api/trabajos/${id}/`),
  create: (data) => api.post("/api/trabajos/", data),
  update: (id, data) => api.put(`/api/trabajos/${id}/`, data),
  patch: (id, data) => api.patch(`/api/trabajos/${id}/`, data),
  delete: (id) => api.delete(`/api/trabajos/${id}/`),
  finalizar: (id, data) =>
    api.patch(`/api/trabajos/${id}/`, {
      ...data,
      estatus: "FINALIZADO",
    }),
};

export const actividadTrabajoAPI = {
  listByTrabajo: (trabajoId) =>
    api.get("/api/actividades/", {
      params: { orden: trabajoId },
    }),

  create: (data) =>
    api.post("/api/actividades/", data),
};

export const compraAPI = {
  list: (params) => api.get("/api/compras/", { params }),
  create: (data) => api.post("/api/compras/", data),
  batch: (data) => api.post("/api/compras/batch/", data),
};

export const movimientoRepuestoAPI = {
  list: (params) =>
    api.get("/api/movimientos-repuesto/", { params }),

  retrieve: (id) =>
    api.get(`/api/movimientos-repuesto/${id}/`),

  create: (data) =>
    api.post("/api/movimientos-repuesto/", data),

  update: (id, data) =>
    api.put(`/api/movimientos-repuesto/${id}/`, data),
};

export const userAPI = {
  list: () => api.get("/api/users/"),
  roles: () => api.get("/api/users/roles/"),
  setRoles: (id, roles) =>
    api.post(`/api/users/${id}/set_roles/`, { roles }),
  create: (data) => api.post("/api/users/", data),
};

export const proveedorAPI = {
  list: () => api.get("/api/proveedores/"),

  retrieve: (id) =>
    api.get(`/api/proveedores/${id}/`),

  create: (data) =>
    api.post("/api/proveedores/", data),

  update: (id, data) =>
    api.put(`/api/proveedores/${id}/`, data),

  delete: (id) =>
    api.delete(`/api/proveedores/${id}/`),
};

export default api;
