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

  ubicacionesConsumible: (id) =>
    api.get(`/api/items/${id}/ubicaciones_consumible/`),

  historialConsumible: (id) =>
    api.get(`/api/items/${id}/historial_consumible/`),
  
  cambiarUbicacionConsumible: (id, data) =>
    api.post(`/api/items/${id}/cambiar_ubicacion_consumible/`, data),

  proveedores: (id) =>
    api.get(`/api/items/${id}/proveedores/`),

  unidadesAsignables: (itemId, params) =>
    api.get(`/api/items/${itemId}/unidades_asignables/`, { params }),

  proveedoresDisponibles: () =>
    api.get("/api/items/proveedores_disponibles/"),

  lotesDisponibles: (itemId, params) =>
    api.get(`/api/items/${itemId}/lotes_disponibles/`, { params }),

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
  gestionMatrix: () =>
    api.get("/api/maquinarias/gestion-matriz/"),
  gestionMatrixProveedoresRepuestos: () =>
    api.get("/api/maquinarias/gestion-matriz-proveedores-repuestos/"),
  gestionHistorialItems: (params) =>
    api.get("/api/maquinarias/gestion-historial-items/", { params }),
  gestionBubbleRepuestos: (params) =>
    api.get("/api/maquinarias/gestion-bubble-repuestos/", { params }),
  gestionSupervivenciaRepuestos: (params) =>
    api.get("/api/maquinarias/gestion-supervivencia-repuestos/", { params }),
  gestionIndicadoresMaquinaria: () =>
    api.get("/api/maquinarias/gestion-indicadores-maquinaria/"),
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
  completarPlan: (id) => api.post(`/api/trabajos/${id}/completar-plan/`),
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

  update: (id, data) =>
    api.put(`/api/actividades/${id}/`, data),

  subirEvidencias: (id, files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("imagenes", file);
    });

    return api.post(`/api/actividades/${id}/subir-evidencias/`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  eliminarEvidencia: (actividadId, evidenciaId) =>
    api.delete(`/api/actividades/${actividadId}/evidencias/${evidenciaId}/`),

  delete: (id) =>
    api.delete(`/api/actividades/${id}/`),
};

export const compraAPI = {
  list: (params) => api.get("/api/compras/", { params }),
  create: (data) => api.post("/api/compras/", data),
  batch: (data) => api.post("/api/compras/batch/", data),
  deleteRegistro: (compraId) => api.post("/api/compras/eliminar-registro/", { compra_id: compraId }),
};

export const ordenCompraAPI = {
  list: (params) => api.get("/api/ordenes-compra/", { params }),
  create: (data) => api.post("/api/ordenes-compra/", data),
  cambiarEstado: (id, estado) =>
    api.post(`/api/ordenes-compra/${id}/cambiar_estado/`, { estado }),
  confirmarRecepcion: (id) =>
    api.post(`/api/ordenes-compra/${id}/confirmar_recepcion/`),
};

export const ordenRequerimientoAPI = {
  list: (params) => api.get("/api/ordenes-requerimiento/", { params }),
  create: (data) => api.post("/api/ordenes-requerimiento/", data),
  patch: (id, data) => api.patch(`/api/ordenes-requerimiento/${id}/`, data),
  cambiarEstado: (id, estado, detalleId = null) =>
    api.post(`/api/ordenes-requerimiento/${id}/cambiar_estado/`, {
      estado,
      ...(detalleId ? { detalle_id: detalleId } : {}),
    }),
  confirmarRecepcion: (id) =>
    api.post(`/api/ordenes-requerimiento/${id}/confirmar_recepcion/`),
};

export const tipoCambioAPI = {
  list: (params) => api.get("/api/tipos-cambio/", { params }),
  create: (data) => api.post("/api/tipos-cambio/", data),
  update: (id, data) => api.put(`/api/tipos-cambio/${id}/`, data),
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

export const movimientoConsumibleAPI = {
  list: (params) =>
    api.get("/api/movimientos-consumible/", { params }),

  create: (data) =>
    api.post("/api/movimientos-consumible/", data),
};


export const itemGrupoAPI = {
  list: (params) => api.get("/api/item-grupos/", { params }),
  retrieve: (id) => api.get(`/api/item-grupos/${id}/`),
  create: (data) => api.post("/api/item-grupos/", data),
  update: (id, data) => api.put(`/api/item-grupos/${id}/`, data),
  delete: (id) => api.delete(`/api/item-grupos/${id}/`),
};

export const userAPI = {
  list: () => api.get("/api/users/"),
  roles: () => api.get("/api/users/roles/"),
  setRoles: (id, roles) =>
    api.post(`/api/users/${id}/set_roles/`, { roles }),
  create: (data) => api.post("/api/users/", data),
};


export const clienteAPI = {
  list: () => api.get("/api/clientes/"),
  create: (data) => api.post("/api/clientes/", data),
  update: (id, data) => api.put(`/api/clientes/${id}/`, data),
  delete: (id) => api.delete(`/api/clientes/${id}/`),
};

export const ubicacionClienteAPI = {
  list: (params) => api.get("/api/ubicaciones-cliente/", { params }),
  create: (data) => api.post("/api/ubicaciones-cliente/", data),
  update: (id, data) => api.put(`/api/ubicaciones-cliente/${id}/`, data),
  delete: (id) => api.delete(`/api/ubicaciones-cliente/${id}/`),
};

export const tareaPorEstandarizarAPI = {
  list: (params) => api.get("/api/tareas-por-estandarizar/", { params }),
  create: (data) => api.post("/api/tareas-por-estandarizar/", data),
  retrieve: (id) => api.get(`/api/tareas-por-estandarizar/${id}/`),
  patch: (id, data) => api.patch(`/api/tareas-por-estandarizar/${id}/`, data),
  update: (id, data) => api.put(`/api/tareas-por-estandarizar/${id}/`, data),
  delete: (id) => api.delete(`/api/tareas-por-estandarizar/${id}/`),
};

export const eventoAPI = {
  list: (params) => api.get("/api/eventos/", { params }),
  retrieve: (id) => api.get(`/api/eventos/${id}/`),
  create: (data) => api.post("/api/eventos/", data),
  patch: (id, data) => api.patch(`/api/eventos/${id}/`, data),
  update: (id, data) => api.put(`/api/eventos/${id}/`, data),
  delete: (id) => api.delete(`/api/eventos/${id}/`),
};

export const asistenciaAPI = {
  list: (params) => api.get("/api/asistencias/", { params }),
  retrieve: (id) => api.get(`/api/asistencias/${id}/`),
  create: (data) => api.post("/api/asistencias/", data),
  patch: (id, data) => api.patch(`/api/asistencias/${id}/`, data),
  update: (id, data) => api.put(`/api/asistencias/${id}/`, data),
  delete: (id) => api.delete(`/api/asistencias/${id}/`),
};

export const sistemaAPI = {
  list: (params) => api.get("/api/sistemas/", { params }),
  create: (data) => api.post("/api/sistemas/", data),
  patch: (id, data) => api.patch(`/api/sistemas/${id}/`, data),
  update: (id, data) => api.put(`/api/sistemas/${id}/`, data),
  delete: (id) => api.delete(`/api/sistemas/${id}/`),
};

export const actividadChecklistAPI = {
  list: (params) => api.get("/api/actividades-checklist/", { params }),
  create: (data) => api.post("/api/actividades-checklist/", data),
  patch: (id, data) => api.patch(`/api/actividades-checklist/${id}/`, data),
  update: (id, data) => api.put(`/api/actividades-checklist/${id}/`, data),
  delete: (id) => api.delete(`/api/actividades-checklist/${id}/`),
};

export const checklistAPI = {
  list: (params) => api.get("/api/checklists/", { params }),
  retrieve: (id) => api.get(`/api/checklists/${id}/`),
  create: (data) => api.post("/api/checklists/", data),
  patch: (id, data) => api.patch(`/api/checklists/${id}/`, data),
  update: (id, data) => api.put(`/api/checklists/${id}/`, data),
  delete: (id) => api.delete(`/api/checklists/${id}/`),
};

export const checklistActividadAPI = {
  list: (params) => api.get("/api/checklist-actividades/", { params }),
  retrieve: (id) => api.get(`/api/checklist-actividades/${id}/`),
  create: (data) => api.post("/api/checklist-actividades/", data),
  patch: (id, data) => api.patch(`/api/checklist-actividades/${id}/`, data),
  update: (id, data) => api.put(`/api/checklist-actividades/${id}/`, data),
  delete: (id) => api.delete(`/api/checklist-actividades/${id}/`),
};

export const checklistEjecucionAPI = {
  list: (params) => api.get("/api/checklist-ejecuciones/", { params }),
  retrieve: (id) => api.get(`/api/checklist-ejecuciones/${id}/`),
  create: (data) => api.post("/api/checklist-ejecuciones/", data),
  patch: (id, data) => api.patch(`/api/checklist-ejecuciones/${id}/`, data),
  update: (id, data) => api.put(`/api/checklist-ejecuciones/${id}/`, data),
  delete: (id) => api.delete(`/api/checklist-ejecuciones/${id}/`),
};

export const checklistRespuestaAPI = {
  list: (params) => api.get("/api/checklist-respuestas/", { params }),
  retrieve: (id) => api.get(`/api/checklist-respuestas/${id}/`),
  create: (data) => api.post("/api/checklist-respuestas/", data),
  patch: (id, data) => api.patch(`/api/checklist-respuestas/${id}/`, data),
  update: (id, data) => api.put(`/api/checklist-respuestas/${id}/`, data),
  delete: (id) => api.delete(`/api/checklist-respuestas/${id}/`),
};

export const reporteOrdenAPI = {
  list: (params) => api.get("/api/reportes-orden/", { params }),
  retrieve: (id) => api.get(`/api/reportes-orden/${id}/`),
  create: (data) => api.post("/api/reportes-orden/", data),
  patch: (id, data) => api.patch(`/api/reportes-orden/${id}/`, data),
  update: (id, data) => api.put(`/api/reportes-orden/${id}/`, data),
  delete: (id) => api.delete(`/api/reportes-orden/${id}/`),
  createIperc: (id) => api.post(`/api/reportes-orden/${id}/crear_iperc/`, {}),
};

export const reporteIpercAPI = {
  list: (params) => api.get("/api/reportes-iperc/", { params }),
  retrieve: (id) => api.get(`/api/reportes-iperc/${id}/`),
  create: (data) => api.post("/api/reportes-iperc/", data),
  patch: (id, data) => api.patch(`/api/reportes-iperc/${id}/`, data),
  update: (id, data) => api.put(`/api/reportes-iperc/${id}/`, data),
  delete: (id) => api.delete(`/api/reportes-iperc/${id}/`),
};

export const ipercRegistroAPI = {
  list: (params) => api.get("/api/iperc-registros/", { params }),
  create: (data) => api.post("/api/iperc-registros/", data),
  patch: (id, data) => api.patch(`/api/iperc-registros/${id}/`, data),
  update: (id, data) => api.put(`/api/iperc-registros/${id}/`, data),
  delete: (id) => api.delete(`/api/iperc-registros/${id}/`),
};

export const gestionCambioAPI = {
  list: (params) => api.get("/api/gestiones-cambio/", { params }),
  create: (data) => api.post("/api/gestiones-cambio/", data),
  patch: (id, data) => api.patch(`/api/gestiones-cambio/${id}/`, data),
  update: (id, data) => api.put(`/api/gestiones-cambio/${id}/`, data),
  delete: (id) => api.delete(`/api/gestiones-cambio/${id}/`),
};

export const secuenciaControlRiesgoAPI = {
  list: (params) => api.get("/api/secuencias-control-riesgo/", { params }),
  create: (data) => api.post("/api/secuencias-control-riesgo/", data),
  patch: (id, data) => api.patch(`/api/secuencias-control-riesgo/${id}/`, data),
  update: (id, data) => api.put(`/api/secuencias-control-riesgo/${id}/`, data),
  delete: (id) => api.delete(`/api/secuencias-control-riesgo/${id}/`),
};

export const medidaCorrectivaAPI = {
  list: (params) => api.get("/api/medidas-correctivas/", { params }),
  create: (data) => api.post("/api/medidas-correctivas/", data),
  patch: (id, data) => api.patch(`/api/medidas-correctivas/${id}/`, data),
  update: (id, data) => api.put(`/api/medidas-correctivas/${id}/`, data),
  delete: (id) => api.delete(`/api/medidas-correctivas/${id}/`),
};

export const detalleSupervisorAPI = {
  list: (params) => api.get("/api/detalles-supervisor/", { params }),
  create: (data, isMultipart = false) =>
    api.post("/api/detalles-supervisor/", data, isMultipart ? {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    } : undefined),
  patch: (id, data, isMultipart = false) =>
    api.patch(`/api/detalles-supervisor/${id}/`, data, isMultipart ? {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    } : undefined),
};

export const encabezadoEstandarizacionAPI = {
  list: (params) => api.get("/api/encabezados-estandarizacion/", { params }),
  create: (data) => api.post("/api/encabezados-estandarizacion/", data),
  update: (id, data) => api.put(`/api/encabezados-estandarizacion/${id}/`, data),
  patch: (id, data) => api.patch(`/api/encabezados-estandarizacion/${id}/`, data),
};

export const detalleEstandarizacionAPI = {
  list: (params) => api.get("/api/detalles-estandarizacion/", { params }),
  retrieve: (id) => api.get(`/api/detalles-estandarizacion/${id}/`),
  createFlowBlock: (data) =>
    api.post("/api/detalles-estandarizacion/crear_desde_flujo/", data),
  create: (formData) =>
    api.post("/api/detalles-estandarizacion/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  patch: (id, data, isMultipart = false) =>
    api.patch(`/api/detalles-estandarizacion/${id}/`, data, isMultipart ? {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    } : undefined),
    update: (id, formData) =>
      api.put(`/api/detalles-estandarizacion/${id}/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }),
  delete: (id) => api.delete(`/api/detalles-estandarizacion/${id}/`),
};

export const conexionEstandarizacionAPI = {
  list: (params) => api.get("/api/conexiones-estandarizacion/", { params }),
  create: (data) => api.post("/api/conexiones-estandarizacion/", data),
  patch: (id, data) => api.patch(`/api/conexiones-estandarizacion/${id}/`, data),
  delete: (id) => api.delete(`/api/conexiones-estandarizacion/${id}/`),
};

export const dimensionAPI = {
  list: () => api.get("/api/dimensiones/"),
  create: (data) => api.post("/api/dimensiones/", data),
  update: (id, data) => api.put(`/api/dimensiones/${id}/`, data),
  delete: (id) => api.delete(`/api/dimensiones/${id}/`),
};

export const unidadMedidaAPI = {
  list: () => api.get("/api/unidades-medida/"),
  create: (data) => api.post("/api/unidades-medida/", data),
  update: (id, data) => api.put(`/api/unidades-medida/${id}/`, data),
  delete: (id) => api.delete(`/api/unidades-medida/${id}/`),
};

export const unidadRelacionAPI = {
  list: () => api.get("/api/relaciones-unidad/"),
  create: (data) => api.post("/api/relaciones-unidad/", data),
  update: (id, data) => api.put(`/api/relaciones-unidad/${id}/`, data),
  delete: (id) => api.delete(`/api/relaciones-unidad/${id}/`),
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

export const catalogoSyncAPI = {
  metadata: () => api.get("/api/catalogo-sync/", { params: { metadata: 1 } }),

  exportData: () =>
    api.get("/api/catalogo-sync/", {
      responseType: "blob",
    }),

  exportTable: (table, format = "csv") =>
    api.get("/api/catalogo-sync/", {
      params: { table, file_format: format },
      responseType: "blob",
    }),

  importData: (formData) =>
    api.post("/api/catalogo-sync/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),

  importTable: (table, file) => {
    const formData = new FormData();
    formData.append("table", table);
    formData.append("file", file);

    return api.post("/api/catalogo-sync/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

export default api;
