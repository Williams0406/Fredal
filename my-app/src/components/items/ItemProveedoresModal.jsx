"use client";

import { useEffect, useState } from "react";
import { itemAPI } from "@/lib/api";

export default function ItemProveedoresModal({ open, itemId, onClose }) {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && itemId) {
      setLoading(true);
      itemAPI.proveedores(itemId)
        .then((res) => setProveedores(res.data))
        .finally(() => setLoading(false));
    }
  }, [open, itemId]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  // Agrupar por moneda
  const proveedoresPorMoneda = proveedores.reduce((acc, p) => {
    acc[p.moneda] = acc[p.moneda] || [];
    acc[p.moneda].push(p);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-[#1e3a8a] flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Proveedores y Precios
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Histórico de compras por proveedor
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              aria-label="Cerrar"
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
                <p className="text-sm text-gray-600">Cargando proveedores...</p>
              </div>
            </div>
          ) : proveedores.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-600 font-medium">
                No hay compras registradas
              </p>
              <p className="text-xs text-gray-500 mt-1">
                No hay proveedores asociados a este item aún
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(proveedoresPorMoneda).map(([moneda, provs]) => (
                <div key={moneda} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-[#1e3a8a] text-white text-xs rounded font-mono">
                        {moneda}
                      </span>
                      Precios en {moneda}
                      <span className="text-sm font-normal text-gray-600">
                        ({provs.length} proveedor{provs.length !== 1 ? 'es' : ''})
                      </span>
                    </h4>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Proveedor
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            RUC
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Precio
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {provs.map((p, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {p.proveedor_nombre}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-700">
                              {p.proveedor_ruc}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-[#1e3a8a]">
                              {Number(p.precio).toFixed(2)}
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