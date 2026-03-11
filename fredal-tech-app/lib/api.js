// lib/api.js
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './constants';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = await SecureStore.getItemAsync('refresh_token');
      if (!refresh) throw error;
      try {
        const { data } = await axios.post(`${API_URL}/api/token/refresh/`, { refresh });
        await SecureStore.setItemAsync('access_token', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        throw error;
      }
    }
    throw error;
  }
);

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  login: async (username, password) => {
    const res = await axios.post(`${API_URL}/api/token/`, { username, password });
    await SecureStore.setItemAsync('access_token', res.data.access);
    await SecureStore.setItemAsync('refresh_token', res.data.refresh);
    return res.data;
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
  },
  me: async () => {
    const res = await api.get('/api/me/');
    return res.data;
  },
};

// ── Trabajos ──────────────────────────────────────────────────────
export const trabajoAPI = {
  list:     (params) => api.get('/api/trabajos/', { params }),
  retrieve: (id)     => api.get(`/api/trabajos/${id}/`),
  patch:    (id, data) => api.patch(`/api/trabajos/${id}/`, data),
  finalizar: (id, data) =>
    api.patch(`/api/trabajos/${id}/`, { ...data, estatus: 'FINALIZADO' }),
};

// ── Actividades ───────────────────────────────────────────────────
export const actividadAPI = {
  listByTrabajo: (trabajoId) =>
    api.get('/api/actividades/', { params: { orden: trabajoId } }),
  create: (data) => api.post('/api/actividades/', data),
  update: (id, data) => api.put(`/api/actividades/${id}/`, data),
  delete: (id)   => api.delete(`/api/actividades/${id}/`),
};

// ── Items ─────────────────────────────────────────────────────────
export const itemAPI = {
  list:               (params)  => api.get('/api/items/', { params }),
  unidadesAsignables: (id, params) => api.get(`/api/items/${id}/unidades_asignables/`, { params }),
  lotesDisponibles:   (id, params) => api.get(`/api/items/${id}/lotes_disponibles/`, { params }),
  proveedoresDisponibles: ()    => api.get('/api/items/proveedores_disponibles/'),
};

// ── Trabajadores ──────────────────────────────────────────────────
export const trabajadorAPI = {
  list: () => api.get('/api/trabajadores/'),
};

// ── Movimientos ───────────────────────────────────────────────────
export const movimientoRepuestoAPI = {
  list:   (params) => api.get('/api/movimientos-repuesto/', { params }),
  create: (data)   => api.post('/api/movimientos-repuesto/', data),
};

export const movimientoConsumibleAPI = {
  list:   (params) => api.get('/api/movimientos-consumible/', { params }),
  create: (data)   => api.post('/api/movimientos-consumible/', data),
};

// ── Catálogos ─────────────────────────────────────────────────────
export const catalogosAPI = {
  get: () => api.get('/api/catalogos/'),
};

export const unidadMedidaAPI = {
  list: () => api.get('/api/unidades-medida/'),
};

export const unidadRelacionAPI = {
  list: () => api.get('/api/relaciones-unidad/'),
};

export default api;