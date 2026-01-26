"use client";

import { useEffect, useState } from "react";
import { itemAPI } from "@/lib/api";

export default function ItemProveedoresModal({ open, itemId, onClose }) {
  const [proveedores, setProveedores] = useState([]);

  useEffect(() => {
    if (open && itemId) {
      itemAPI.proveedores(itemId).then((res) => {
        setProveedores(res.data);
      });
    }
  }, [open, itemId]);

  if (!open) return null;

  return (
    // 🔲 OVERLAY → clic aquí CIERRA
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      {/* ⬜ MODAL → clic aquí NO CIERRA */}
      <div
        className="bg-white rounded-lg w-full max-w-lg p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            Proveedores y precios
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black"
            aria-label="Cerrar"
          >
            ✖
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-2 text-left">Proveedor</th>
                <th className="p-2 text-left">RUC</th>
                <th className="p-2 text-right">Precio</th>
                <th className="p-2 text-center">Moneda</th>
              </tr>
            </thead>

            <tbody>
              {proveedores.map((p, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2">{p.proveedor_nombre}</td>
                  <td className="p-2 font-mono">{p.proveedor_ruc}</td>
                  <td className="p-2 text-right font-semibold">
                    {Number(p.precio).toFixed(2)}
                  </td>
                  <td className="p-2 text-center">
                    {p.moneda}
                  </td>
                </tr>
              ))}

              {proveedores.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="p-4 text-center text-gray-500"
                  >
                    No hay compras registradas para este item
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
