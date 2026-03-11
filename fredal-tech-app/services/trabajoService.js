// services/trabajoService.js
import api from '../lib/api';

export const trabajoService = {
  list: (params) =>
    api.get('/api/trabajos/', { params }),

  retrieve: (id) =>
    api.get(`/api/trabajos/${id}/`),

  create: (data) =>
    api.post('/api/trabajos/', data),

  update: (id, data) =>
    api.put(`/api/trabajos/${id}/`, data),

  patch: (id, data) =>
    api.patch(`/api/trabajos/${id}/`, data),

  delete: (id) =>
    api.delete(`/api/trabajos/${id}/`),

  // data: { hora_inicio, hora_fin, horometro, estado_equipo }
  finalizar: (id, data) =>
    api.patch(`/api/trabajos/${id}/`, { ...data, estatus: 'FINALIZADO' }),
};