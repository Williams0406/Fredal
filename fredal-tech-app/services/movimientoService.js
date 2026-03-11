// services/movimientoService.js
import api from '../lib/api';

export const movimientoService = {
  listRepuestos: (actividadId) =>
    api.get('/api/movimientos-repuesto/', { params: { actividad: actividadId } }),

  createRepuesto: (data) =>
    api.post('/api/movimientos-repuesto/', data),

  listConsumibles: (actividadId) =>
    api.get('/api/movimientos-consumible/', { params: { actividad: actividadId } }),

  createConsumible: (data) =>
    api.post('/api/movimientos-consumible/', data),

  unidadesAsignables: (itemId, params) =>
    api.get(`/api/items/${itemId}/unidades_asignables/`, { params }),

  lotesDisponibles: (itemId, params) =>
    api.get(`/api/items/${itemId}/lotes_disponibles/`, { params }),
};