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

  // 🔑 UX: cerrar con ESC
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  // 🔄 Agrupar historial por unidad (id implícito)
  const agrupado = historial.reduce((acc, h) => {
    const key = h.item_unidad || h.id; // fallback seguro
    acc[key] = acc[key] || [];
    acc[key].push(h);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-4xl max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            📜 Historial de ubicación y estado
          </h2>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1 border rounded hover:bg-gray-100"
          >
            Cerrar
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {loading && (
            <p className="text-gray-500 text-sm">Cargando historial…</p>
          )}

          {!loading && historial.length === 0 && (
            <p className="text-gray-500 text-sm">
              No hay historial registrado para este item.
            </p>
          )}

          {Object.values(agrupado).map((movimientos, idx) => (
            <div
              key={idx}
              className="border rounded-lg p-4 bg-gray-50"
            >
              <h3 className="font-medium mb-3">
                🔧 Unidad #{idx + 1}
              </h3>

              <table className="w-full text-sm bg-white border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">Ubicación</th>
                    <th className="p-2 border">Orden</th>
                    <th className="p-2 border">Desde</th>
                    <th className="p-2 border">Hasta</th>
                    <th className="p-2 border">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((h, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">
                        {h.tipo} – {h.nombre}
                      </td>
                      <td className="p-2 text-center">
                        {h.orden_trabajo || "—"}
                      </td>
                      <td className="p-2">{h.fecha_inicio}</td>
                      <td className="p-2">
                        {h.fecha_fin || (
                          <span className="text-green-600 font-medium">
                            Actual
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium
                            ${h.fecha_fin
                              ? "bg-gray-200 text-gray-700"
                              : "bg-green-100 text-green-700"
                            }`}
                        >
                          {h.fecha_fin ? "Histórico" : "Activo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
