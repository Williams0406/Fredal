"use client";

import { useEffect, useState, useRef } from "react";
import { itemAPI } from "@/lib/api";

export default function ItemKardexModal({ itemId, open, onClose }) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);

  const modalRef = useRef(null);

  /* =========================
     CARGA DE KARDEX
  ========================= */
  useEffect(() => {
    if (!open || !itemId) return;

    setLoading(true);

    itemAPI
      .kardexContable(itemId)
      .then((res) => setRegistros(res.data))
      .finally(() => setLoading(false));
  }, [open, itemId]);

  /* =========================
     CERRAR CON ESC
  ========================= */
  useEffect(() => {
    if (!open) return;

    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  /* =========================
     CERRAR AL CLIC FUERA
  ========================= */
  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onMouseDown={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="bg-white w-full max-w-6xl rounded-xl max-h-[90vh] flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-[#1e3a8a] flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Kardex Contable
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Registro de movimientos de inventario con valorización
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              title="Cerrar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-gray-600">Cargando kardex...</p>
              </div>
            </div>
          ) : registros.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm text-gray-600 font-medium">
                No hay movimientos registrados
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Los registros de kardex aparecerán aquí
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        Fecha
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Registro
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        Inv. Inicial
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Entrada
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Salida
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        Costo Unit.
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        Inv. Final
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        Costo Final
                      </th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {registros.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {new Date(r.fecha).toLocaleDateString('es-PE')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{r.registro}</span>

                            {r.maquinaria && (
                              <span className="text-xs text-gray-500 mt-0.5">
                                {r.maquinaria.codigo} · {r.maquinaria.nombre}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-700">
                          {r.inventario_inicial}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {r.entrada > 0 ? (
                            <span className="text-green-700 font-semibold">
                              +{r.entrada}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {r.salida > 0 ? (
                            <span className="text-red-700 font-semibold">
                              -{r.salida}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700 whitespace-nowrap">
                          {Number(r.costo_unitario).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center font-semibold text-gray-900">
                          {r.inventario_final_cantidad}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-[#1e3a8a] whitespace-nowrap">
                          {Number(r.inventario_final_costo).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {registros.length > 0 && (
                <span>
                  Total de registros: <span className="font-semibold text-gray-900">{registros.length}</span>
                </span>
              )}
            </div>
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