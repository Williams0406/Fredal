"use client";

import { useEffect, useMemo, useState } from "react";
import { itemAPI } from "@/lib/api";

export default function ItemHistorialModal({ itemId, open, onClose }) {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (open && itemId) {
      setLoading(true);
      itemAPI
        .historial(itemId)
        .then((res) => setHistorial(res.data))
        .finally(() => setLoading(false));
    }
  }, [open, itemId]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const unidades = useMemo(() => {
    const grouped = historial.reduce((acc, h) => {
      const key = h.item_unidad || h.id;
      if (!acc[key]) {
        acc[key] = {
          unidadId: h.item_unidad,
          serie: h.item_unidad_serie,
          estado: h.item_unidad_estado,
          movimientos: [],
        };
      }
      acc[key].movimientos.push(h);
      return acc;
    }, {});

    return Object.values(grouped);
  }, [historial]);

  const toggleUnidad = (unidadId) => {
    setExpanded((prev) => ({ ...prev, [unidadId]: !prev[unidadId] }));
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("es-PE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderUbicacion = (h) => {
    if (h.tipo === "MAQUINARIA" && h.maquinaria) {
      return (
        <div className="text-sm text-gray-700">
          <div className="font-medium text-gray-900">MAQUINARIA</div>
          <div>
            <span className="font-semibold">{h.maquinaria.codigo_maquina || h.maquinaria.codigo} - {h.maquinaria.nombre}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="text-sm text-gray-700">
        <div className="font-medium text-gray-900">{h.tipo || "-"}</div>
        <div>{h.nombre || "-"}</div>
      </div>
    );
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
<div className="border-b border-gray-200 px-6 py-4 flex-shrink-0 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#1e3a8a]">Historial de Ubicaciones</h2>
            <p className="text-sm text-gray-600 mt-1">
              ItemUnidad Totales: <span className="font-semibold">{unidades.length}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <p className="text-sm text-gray-600">Cargando historial...</p>
          ) : unidades.length === 0 ? (
            <p className="text-sm text-gray-600">No hay historial registrado.</p>
          ) : (
            <div className="space-y-4">
              {unidades.map((u, idx) => {
                const isOpen = Boolean(expanded[u.unidadId]);
                return (
                  <div key={u.unidadId || idx} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleUnidad(u.unidadId || idx)}
                      className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between text-left"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          ItemUnidad #{idx + 1} {u.serie ? `· Serie: ${u.serie}` : ""}
                        </p>
                        <p className="text-xs text-gray-600">
                          Estado: {u.estado || "-"} · Movimientos: {u.movimientos.length}
                        </p>
                      </div>
                      <span className="text-sm text-[#1e3a8a]">{isOpen ? "Ocultar" : "Ver movimientos"}</span>
                    </button>

                    {isOpen && (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-y border-gray-200">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Ubicación</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Orden de Trabajo</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Fecha Inicio</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Fecha Fin</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {u.movimientos.map((h) => (
                              <tr key={h.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">{renderUbicacion(h)}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{h.orden_trabajo || "Sin orden"}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(h.fecha_inicio)}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  {h.fecha_fin ? formatDateTime(h.fecha_fin) : (
                                    <span className="text-[#84cc16] font-semibold">Ubicación actual</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}