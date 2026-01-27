"use client";

import { useEffect, useState } from "react";
import { itemAPI } from "@/lib/api";

export default function ItemHistorialModal({ itemId, open, onClose }) {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && itemId) {
      setLoading(true);
      itemAPI.historial(itemId)
        .then((res) => setHistorial(res.data))
        .finally(() => setLoading(false));
    }
  }, [open, itemId]);

  // Cerrar con ESC
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  // Agrupar historial por unidad
  const agrupado = historial.reduce((acc, h) => {
    const key = h.item_unidad || h.id;
    acc[key] = acc[key] || [];
    acc[key].push(h);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-[#1e3a8a] flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Historial de Ubicaciones
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Registro completo de movimientos y estados de las unidades
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-gray-600">Cargando historial...</p>
              </div>
            </div>
          ) : historial.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-600 font-medium">
                No hay historial registrado
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Los movimientos aparecerán aquí cuando se registren
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(agrupado).map(([key, movimientos], idx) => (
                <div
                  key={key}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Header de la unidad */}
                  <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#1e3a8a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Unidad #{idx + 1}
                      <span className="text-sm font-normal text-gray-600">
                        ({movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''})
                      </span>
                    </h3>
                  </div>

                  {/* Tabla de movimientos */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Ubicación
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Orden de Trabajo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Fecha Inicio
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Fecha Fin
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {movimientos.map((h, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-4 py-3 text-sm">
                              <div>
                                <span className="font-medium text-gray-900">{h.tipo}</span>
                                <span className="text-gray-600"> – {h.nombre}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {h.orden_trabajo || (
                                <span className="text-gray-400">Sin orden</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {new Date(h.fecha_inicio).toLocaleDateString('es-PE')}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {h.fecha_fin ? (
                                new Date(h.fecha_fin).toLocaleDateString('es-PE')
                              ) : (
                                <span className="text-[#84cc16] font-semibold flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Ubicación actual
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`
                                  inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                                  ${h.fecha_fin
                                    ? "bg-gray-100 text-gray-700"
                                    : "bg-green-100 text-green-700"
                                  }
                                `}
                              >
                                {h.fecha_fin ? "Histórico" : "Activo"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl flex-shrink-0">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white 
                       border border-gray-300 rounded-lg hover:bg-gray-50 
                       transition-all duration-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}