// hooks/useActividades.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { actividadAPI } from '../lib/api';

export const useActividades = (trabajoId) =>
  useQuery({
    queryKey: ['actividades', trabajoId],
    queryFn: async () => {
      const { data } = await actividadAPI.listByTrabajo(trabajoId);
      return data;
    },
    enabled: !!trabajoId,
  });

export const useCreateActividad = (trabajoId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: actividadAPI.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actividades', trabajoId] });
      qc.invalidateQueries({ queryKey: ['trabajo', trabajoId] });
    },
  });
};

export const useUpdateActividad = (trabajoId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => actividadAPI.update(id, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['actividades', trabajoId] }),
  });
};

export const useDeleteActividad = (trabajoId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: actividadAPI.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actividades', trabajoId] });
      qc.invalidateQueries({ queryKey: ['trabajo', trabajoId] });
    },
  });
};