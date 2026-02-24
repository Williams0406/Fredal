"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { maquinariaAPI } from "@/lib/api";

export default function MaquinariaResumen({
  maquinariaId,
  open,
  onClose,
}) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (open && maquinariaId) {
      maquinariaAPI
        .unidades(maquinariaId)
        .then((res) => {
          setData(res.data);
        })
        .catch((error) => {
          console.error("Error al cargar resumen:", error);
        });
    }
  }, [open, maquinariaId]);

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Resumen de Maquinaria"
    >
      {data === null ? (
        <div className="py-12 text-center">
          <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#1e3a8a] rounded-full animate-spin"></div>
          <p className="text-sm text-gray-600 mt-3">Cargando resumen...</p>
        </div>
      ) : !data ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No se pudo cargar la información</p>
        </div>
      ) : (
        <>
          {/* HEADER INFO */}
          <div className="bg-gradient-to-br from-[#1e3a8a] to-[#1e40af] rounded-lg p-5 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">
                  {data.maquinaria?.codigo}
                </h3>
                <p className="text-sm text-blue-100">
                  {data.maquinaria?.nombre}
                </p>
              </div>
            </div>
          </div>

          {/* ESTADÍSTICAS */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total Unidades</p>
                  <p className="text-2xl font-semibold text-[#1e3a8a]">
                    {data.unidades.length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-[#1e3a8a]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-700 mb-1">Centro de Costos</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-medium text-gray-700">S/</span>
                    <span className="text-2xl font-semibold text-[#84cc16]">
                      {Number(data.centro_costos).toLocaleString("es-PE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* TABLA DE UNIDADES */}
          {data.unidades.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <svg
                className="w-12 h-12 text-gray-300 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <p className="text-sm text-gray-600">
                No hay unidades asignadas a esta maquinaria
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Serie
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Costo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.unidades.map((u) => (
                      <tr key={u.unidad_id} className="hover:bg-gray-50 transition-colors">
                        {/* Item */}
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {u.item_nombre}
                            </p>
                            {u.tipo_insumo !== "CONSUMIBLE" && (
                              <p className="text-xs text-gray-600 line-clamp-1">
                                {u.item_codigo}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Serie */}
                        <td className="px-4 py-3">
                          <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                            {u.serie}
                          </code>
                        </td>

                        {/* Estado */}
                        <td className="px-4 py-3 text-center">
                          <EstadoBadge estado={u.estado} />
                        </td>

                        {/* Cantidad */}
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-gray-800">
                            {Number(u.cantidad ?? 1).toLocaleString("es-PE", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 6,
                            })}
                          </span>
                        </td>

                        {/* Costo */}
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-gray-900">
                            S/ {Number(u.costo ?? u.costo_unitario).toLocaleString("es-PE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* FOOTER */}
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Total de {data.unidades.length} unidades
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      Centro de Costos:
                    </span>
                    <span className="text-lg font-semibold text-[#84cc16]">
                      S/ {Number(data.centro_costos).toLocaleString("es-PE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

// Componente auxiliar para badges de estado
function EstadoBadge({ estado }) {
  const styles = {
    NUEVO: "bg-green-100 text-green-800 border-green-200",
    USADO: "bg-blue-100 text-blue-800 border-blue-200",
    INOPERATIVO: "bg-red-100 text-red-800 border-red-200",
    REPARADO: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  const icons = {
    NUEVO: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    USADO: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
      </svg>
    ),
    INOPERATIVO: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    REPARADO: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    ),
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${
        styles[estado] || "bg-gray-100 text-gray-800 border-gray-200"
      }`}
    >
      {icons[estado]}
      {estado}
    </span>
  );
}