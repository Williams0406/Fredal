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
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      onMouseDown={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="bg-white w-full max-w-5xl rounded-lg shadow-lg p-6 max-h-[85vh] overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ===== HEADER ===== */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            📊 Kardex contable del item
          </h2>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black text-xl"
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* ===== CONTENIDO ===== */}
        <div className="overflow-auto border rounded">
          {loading ? (
            <p className="p-4 text-sm text-gray-500">Cargando kardex…</p>
          ) : registros.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">
              No hay movimientos registrados.
            </p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="border px-2 py-1">Fecha</th>
                  <th className="border px-2 py-1">Registro</th>
                  <th className="border px-2 py-1">Inv. Inicial</th>
                  <th className="border px-2 py-1">Entrada</th>
                  <th className="border px-2 py-1">Salida</th>
                  <th className="border px-2 py-1">Costo Unit.</th>
                  <th className="border px-2 py-1">Inv. Final</th>
                  <th className="border px-2 py-1">Costo Final</th>
                </tr>
              </thead>

              <tbody>
                {registros.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="border px-2 py-1">
                      {new Date(r.fecha).toLocaleDateString()}
                    </td>
                    <td className="border px-2 py-1">
                      <div className="flex flex-col">
                        <span className="font-medium">{r.registro}</span>

                        {r.maquinaria && (
                          <span className="text-xs text-gray-500">
                            {r.maquinaria.codigo} · {r.maquinaria.nombre}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border px-2 py-1 text-center">
                      {r.inventario_inicial}
                    </td>
                    <td className="border px-2 py-1 text-center">
                      {r.entrada}
                    </td>
                    <td className="border px-2 py-1 text-center">
                      {r.salida}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      {r.costo_unitario}
                    </td>
                    <td className="border px-2 py-1 text-center">
                      {r.inventario_final_cantidad}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      {r.inventario_final_costo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ===== FOOTER ===== */}
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
