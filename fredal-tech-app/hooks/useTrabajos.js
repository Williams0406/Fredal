// hooks/useTrabajos.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trabajoAPI } from '../lib/api';

export const TRABAJOS_KEY = ['trabajos'];

export const useTrabajos = (params) =>
  useQuery({
    queryKey: [...TRABAJOS_KEY, params],
    queryFn: async () => {
      const { data } = await trabajoAPI.list(params);
      return data;
    },
  });

export const useTrabajo = (id) =>
  useQuery({
    queryKey: ['trabajo', id],
    queryFn: async () => {
      const { data } = await trabajoAPI.retrieve(id);
      return data;
    },
    enabled: !!id,
  });

export const usePatchTrabajo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => trabajoAPI.patch(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: TRABAJOS_KEY });
      qc.invalidateQueries({ queryKey: ['trabajo', id] });
    },
  });
};

export const useFinalizarTrabajo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => trabajoAPI.finalizar(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: TRABAJOS_KEY });
      qc.invalidateQueries({ queryKey: ['trabajo', id] });
    },
  });
};