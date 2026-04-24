// services/actividadService.js
import api from '../lib/api';

export const actividadService = {
  listByTrabajo: (trabajoId) =>
    api.get('/api/actividades/', { params: { orden: trabajoId } }),

  create: (data) =>
    api.post('/api/actividades/', data),

  update: (id, data) =>
    api.put(`/api/actividades/${id}/`, data),

  delete: (id) =>
    api.delete(`/api/actividades/${id}/`),
};