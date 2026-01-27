"use client";

import { useState } from "react";

export default function CompraTable({ compras = [] }) {
  const [search, setSearch] = useState("");
  const [moneda, setMoneda] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const comprasFiltradas = compras.filter((c) => {
    const texto =
      `${c.item_nombre} ${c.item_codigo} ${c.proveedor_nombre || ""} ${
        c.codigo_comprobante || ""
      }`
        .toLowerCase()
        .includes(search.toLowerCase());

    const monedaOK = moneda ? c.moneda === moneda : true;
    const proveedorOK = proveedor
      ? (c.proveedor_nombre || "")
          .toLowerCase()
          .includes(proveedor.toLowerCase())
      : true;

    const fechaOK =
      (!fechaDesde || c.fecha >= fechaDesde) &&
      (!fechaHasta || c.fecha <= fechaHasta);

    return texto && monedaOK && proveedorOK && fechaOK;
  });

  const hasFilters = search || moneda || proveedor || fechaDesde || fechaHasta;

  const clearFilters = () => {
    setSearch("");
    setMoneda("");
    setProveedor("");
    setFechaDesde("");
    setFechaHasta("");
  };

  return (
    <div className="space-y-4">
      
      {/* FILTROS */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Filtros de búsqueda</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            placeholder="Buscar item, código, proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                     transition-all duration-200 placeholder:text-gray-400"
          />

          <input
            placeholder="Proveedor"
            value={proveedor}
            onChange={(e) => setProveedor(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                     transition-all duration-200 placeholder:text-gray-400"
          />

          <select
            value={moneda}
            onChange={(e) => setMoneda(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                     transition-all duration-200"
          >
            <option value="">Todas las monedas</option>
            <option value="PEN">PEN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>

          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            placeholder="Fecha desde"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                     transition-all duration-200"
          />

          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            placeholder="Fecha hasta"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                     transition-all duration-200"
          />
        </div>

        {hasFilters && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando <span className="font-semibold text-[#1e3a8a]">{comprasFiltradas.length}</span> de {compras.length} compras
            </p>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1
                       transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* TABLA */}
      {comprasFiltradas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-gray-600 font-medium">
            {hasFilters ? "No se encontraron resultados" : "No hay compras registradas"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {hasFilters ? "Intenta ajustar los filtros de búsqueda" : "Las compras aparecerán aquí"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Cant.
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    V. Unit.
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    V. Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    C. Unit.
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    C. Total
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Mon.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Comprobante
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {comprasFiltradas.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {new Date(c.fecha).toLocaleDateString('es-PE')}
                    </td>
                    <td className={`
                      px-4 py-3 text-sm font-mono font-semibold whitespace-nowrap
                      ${c.item_volvo ? "bg-yellow-50 text-yellow-900" : "text-gray-900"}
                    `}>
                      {c.item_codigo}
                      {c.item_volvo && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded">
                          VOLVO
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {c.item_nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.proveedor_nombre || <span className="text-gray-400">Sin proveedor</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-center whitespace-nowrap">
                      {c.cantidad}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                      {Number(c.valor_unitario).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                      {Number(c.valor_total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                      {Number(c.costo_unitario).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                      {Number(c.costo_total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                        {c.moneda}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      <div>
                        <span className="font-medium">{c.tipo_comprobante}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {c.codigo_comprobante}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales por moneda */}
          <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
            <div className="flex flex-wrap gap-6 text-sm">
              {["PEN", "USD", "EUR"].map((mon) => {
                const totalMoneda = comprasFiltradas
                  .filter((c) => c.moneda === mon)
                  .reduce((sum, c) => sum + Number(c.costo_total), 0);

                if (totalMoneda === 0) return null;

                return (
                  <div key={mon} className="flex items-center gap-2">
                    <span className="text-gray-600">Total {mon}:</span>
                    <span className="font-semibold text-[#1e3a8a]">
                      {totalMoneda.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}