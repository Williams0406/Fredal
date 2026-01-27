"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { maquinariaAPI } from "@/lib/api";

export default function MaquinariaHistorial({
  maquinariaId,
  open,
  onClose,
}) {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && maquinariaId) {
      setLoading(true);
      maquinariaAPI
        .retrieve(maquinariaId)
        .then((res) => {
          setOrdenes(res.data.ordenes || []);
        })
        .catch((error) => {
          console.error("Error al cargar historial:", error);
        })
        .finally(() => setLoading(false));
    }
  }, [open, maquinariaId]);

  // Estadísticas rápidas
  const stats = {
    total: ordenes.length,
    pendientes: ordenes.filter(o => o.estatus === "PENDIENTE").length,
    enProceso: ordenes.filter(o => o.estatus === "EN_PROCESO").length,
    finalizadas: ordenes.filter(o => o.estatus === "FINALIZADO").length,
  };

  return (
    <Modal open={open} onClose={onClose} title="Historial de Órdenes de Trabajo">
      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#1e3a8a] rounded-full animate-spin"></div>
          <p className="text-sm text-gray-600 mt-3">Cargando historial...</p>
        </div>
      ) : ordenes.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 text-gray-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-base font-medium text-gray-900 mb-1">
            Sin órdenes de trabajo
          </h3>
          <p className="text-sm text-gray-500">
            No hay órdenes registradas para esta maquinaria
          </p>
        </div>
      ) : (
        <>
          {/* ESTADÍSTICAS */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-semibold text-[#1e3a8a]">
                {stats.total}
              </p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <p className="text-xs text-gray-600 mb-1">Pendientes</p>
              <p className="text-2xl font-semibold text-yellow-700">
                {stats.pendientes}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-gray-600 mb-1">En Proceso</p>
              <p className="text-2xl font-semibold text-blue-700">
                {stats.enProceso}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <p className="text-xs text-gray-600 mb-1">Finalizadas</p>
              <p className="text-2xl font-semibold text-green-700">
                {stats.finalizadas}
              </p>
            </div>
          </div>

          {/* LISTA DE ÓRDENES */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {ordenes.map((orden) => (
              <div
                key={orden.id}
                className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                {/* CABECERA ORDEN */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#1e3a8a] rounded-lg flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {orden.codigo_orden}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(orden.fecha).toLocaleDateString("es-PE", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <StatusBadge status={orden.estatus} />
                  </div>

                  {/* Información adicional de la orden */}
                  {(orden.prioridad || orden.lugar) && (
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200">
                      {orden.prioridad && (
                        <div className="flex items-center gap-1.5">
                          <svg
                            className="w-4 h-4 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          <span className="text-xs text-gray-700">
                            Prioridad: <span className="font-medium">{orden.prioridad}</span>
                          </span>
                        </div>
                      )}
                      {orden.lugar && (
                        <div className="flex items-center gap-1.5">
                          <svg
                            className="w-4 h-4 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <span className="text-xs text-gray-700">
                            {orden.lugar}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ACTIVIDADES */}
                <div className="px-4 py-3">
                  {orden.actividades.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      Sin actividades registradas
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                        Actividades ({orden.actividades.length})
                      </p>
                      {orden.actividades.map((act) => (
                        <div
                          key={act.id}
                          className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-[#84cc16] rounded-full mt-1.5 flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {act.tipo_actividad}
                                {act.tipo_actividad === "MANTENIMIENTO" && (
                                  <span className="text-gray-600">
                                    {" · "}
                                    {act.tipo_mantenimiento}
                                    {" · "}
                                    {act.subtipo}
                                  </span>
                                )}
                              </p>

                              {act.descripcion && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                  {act.descripcion}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

// Componente auxiliar para badges de estado
function StatusBadge({ status }) {
  const styles = {
    PENDIENTE: "bg-yellow-100 text-yellow-800 border-yellow-200",
    EN_PROCESO: "bg-blue-100 text-blue-800 border-blue-200",
    FINALIZADO: "bg-green-100 text-green-800 border-green-200",
  };

  const labels = {
    PENDIENTE: "Pendiente",
    EN_PROCESO: "En Proceso",
    FINALIZADO: "Finalizado",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border ${
        styles[status] || "bg-gray-100 text-gray-800 border-gray-200"
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {labels[status] || status}
    </span>
  );
}