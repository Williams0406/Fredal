"use client";

import { useEffect, useState } from "react";
import { itemAPI, unidadMedidaAPI, unidadRelacionAPI } from "@/lib/api";
import ItemFormModal from "./ItemFormModal";
import ItemHistorialModal from "./ItemHistorialModal";
import ItemUbicacionModal from "./ItemUbicacionModal";
import ItemKardexModal from "./ItemKardexModal";
import ItemProveedoresModal from "./ItemProveedoresModal";

export default function ItemTable() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [unidades, setUnidades] = useState([]);
  const [relaciones, setRelaciones] = useState([]);
  const [displayUnitId, setDisplayUnitId] = useState("");

  const [selectedItem, setSelectedItem] = useState(null);
  const [openHistorial, setOpenHistorial] = useState(false);
  const [openUbicacion, setOpenUbicacion] = useState(false);
  const [openKardex, setOpenKardex] = useState(false);
  const [openProveedores, setOpenProveedores] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await itemAPI.list();
      setItems(res.data);
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    unidadMedidaAPI.list().then((res) => setUnidades(res.data));
    unidadRelacionAPI.list().then((res) => setRelaciones(res.data));
    const savedUnitId = window.localStorage.getItem("stock_display_unit_id");
    if (savedUnitId) setDisplayUnitId(savedUnitId);
  }, []);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === "stock_display_unit_id") {
        setDisplayUnitId(event.newValue || "");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const handleDisplayChange = () => {
      const savedUnitId = window.localStorage.getItem("stock_display_unit_id");
      setDisplayUnitId(savedUnitId || "");
    };
    window.addEventListener("stockDisplayChange", handleDisplayChange);
    return () =>
      window.removeEventListener("stockDisplayChange", handleDisplayChange);
  }, []);

  const displayUnit = unidades.find((u) => String(u.id) === String(displayUnitId));
  const baseUnitForDimension = (dimensionId) =>
    unidades.find((u) => u.dimension === dimensionId && u.es_base);
  const relationForUnits = (baseUnitId, relatedUnitId) =>
    relaciones.find(
      (rel) =>
        rel.unidad_base === baseUnitId &&
        rel.unidad_relacionada === relatedUnitId
    );

  const formatStock = (item) => {
  // REPUESTOS: unidades físicas
  if (item.tipo_insumo !== "CONSUMIBLE") {
    return {
      valor: item.unidades_disponibles ?? 0,
      unidad: "UNID",
    };
  }

  // Consumibles
  const baseUnit = item.unidad_base;
  if (!baseUnit) {
    return {
      valor: item.unidades_disponibles ?? 0,
      unidad: "",
    };
  }

  // Si el usuario seleccionó otra unidad
  if (
    displayUnit &&
    displayUnit.dimension === item.dimension &&
    displayUnit.id !== baseUnit.id
  ) {
    const relacion = relaciones.find(
      (r) =>
        r.unidad_base === baseUnit.id &&
        r.unidad_relacionada === displayUnit.id
    );

    if (relacion) {
      const valor = Number(item.unidades_disponibles) * Number(relacion.factor);
      return {
        valor: valor.toFixed(2),
        unidad: displayUnit.simbolo || displayUnit.nombre,
      };
    }
  }

  // Default: unidad base
  return {
    valor: item.unidades_disponibles,
    unidad: baseUnit.simbolo || baseUnit.nombre,
  };
};

  // Estadísticas del inventario
  const stats = {
    total: items.length,
    repuestos: items.filter((i) => i.tipo_insumo === "REPUESTO").length,
    consumibles: items.filter((i) => i.tipo_insumo === "CONSUMIBLE").length,
    volvo: items.filter((i) => i.volvo).length,
    totalUnidades: items.reduce((sum, i) => sum + (i.unidades_disponibles || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* CARDS DE ESTADÍSTICAS (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Total Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
                Total Items
              </p>
              <p className="text-[32px] font-semibold text-[#1e3a5f] mt-2">
                {stats.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Repuestos */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
                Repuestos
              </p>
              <p className="text-[32px] font-semibold text-[#1e3a5f] mt-2">
                {stats.repuestos}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Consumibles */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
                Consumibles
              </p>
              <p className="text-[32px] font-semibold text-[#1e3a5f] mt-2">
                {stats.consumibles}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>

        {/* Volvo */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
                Volvo OEM
              </p>
              <p className="text-[32px] font-semibold text-yellow-600 mt-2">
                {stats.volvo}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Unidades */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
                Unidades
              </p>
              <p className="text-[32px] font-semibold text-[#84cc16] mt-2">
                {stats.totalUnidades}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-[#84cc16]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* TABLA DE ITEMS */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header de tabla */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-[#1e3a5f]">
              Catálogo de inventario
            </h2>
            <p className="text-[13px] text-gray-500 mt-0.5">
              {items.length} {items.length === 1 ? "item registrado" : "items registrados"}
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="px-5 py-2.5 bg-[#1e3a5f] text-white text-[14px] font-medium rounded-lg hover:bg-[#152d4a] transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Item
          </button>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="px-6 py-16 text-center">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1e3a5f] rounded-full animate-spin"></div>
              <p className="text-[14px] text-gray-500">Cargando inventario...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-[15px] font-medium text-gray-900">
                  No hay items registrados
                </p>
                <p className="text-[13px] text-gray-500 mt-1">
                  Comienza agregando tu primer item al inventario
                </p>
              </div>
              <button
                onClick={() => setOpen(true)}
                className="mt-2 text-[14px] text-[#1e3a5f] hover:text-[#152d4a] font-medium"
              >
                Crear primer item
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
                    Código
                  </th>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
                    Item / Descripción
                  </th>
                  <th className="px-6 py-4 text-center text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
                    Stock
                  </th>
                  <th className="px-6 py-4 text-center text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
                    Tipo
                  </th>
                  <th className="px-6 py-4 text-center text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    {/* Código */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-[14px] font-mono font-semibold text-gray-900">
                          {item.codigo}
                        </code>
                        {item.volvo && (
                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold bg-yellow-100 text-yellow-800 rounded border border-yellow-300">
                            VOLVO
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Item */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-[14px] font-medium text-gray-900">
                          {item.nombre}
                        </p>
                        <p className="text-[13px] text-gray-500 mt-0.5">
                          Unidad: {item.unidad_medida_detalle?.nombre || "UNIDAD"}
                        </p>
                      </div>
                    </td>

                    {/* Stock Disponible */}
                    <td className="px-6 py-4 text-center">
                      {(() => {
                        const stock = formatStock(item);
                        return (
                          <>
                      <div className="inline-flex items-center justify-center min-w-[56px] px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
                        <span className="text-[16px] font-bold text-[#1e3a5f]">
                          {stock.valor}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500">
                        {stock.unidad}
                      </p>
                          </>
                        );
                      })()}
                    </td>

                    {/* Tipo */}
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`
                          inline-flex items-center px-3 py-1.5 rounded-lg text-[12px] font-medium border
                          ${
                            item.tipo_insumo === "REPUESTO"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-purple-50 text-purple-700 border-purple-200"
                          }
                        `}
                      >
                        {item.tipo_insumo}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <ActionButton
                          title="Ubicación de unidades"
                          icon="location"
                          onClick={() => {
                            setSelectedItem(item.id);
                            setOpenUbicacion(true);
                          }}
                        />

                        <ActionButton
                          title="Historial de movimientos"
                          icon="history"
                          onClick={() => {
                            setSelectedItem(item.id);
                            setOpenHistorial(true);
                          }}
                        />

                        <ActionButton
                          title="Kardex contable"
                          icon="chart"
                          onClick={() => {
                            setSelectedItem(item.id);
                            setOpenKardex(true);
                          }}
                        />

                        <ActionButton
                          title="Proveedores y precios"
                          icon="money"
                          onClick={() => {
                            setSelectedItem(item.id);
                            setOpenProveedores(true);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALES */}
      <ItemFormModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={loadItems}
      />

      <ItemHistorialModal
        open={openHistorial}
        itemId={selectedItem}
        onClose={() => setOpenHistorial(false)}
      />

      <ItemUbicacionModal
        open={openUbicacion}
        itemId={selectedItem}
        onClose={() => setOpenUbicacion(false)}
      />

      <ItemKardexModal
        open={openKardex}
        itemId={selectedItem}
        onClose={() => setOpenKardex(false)}
      />

      <ItemProveedoresModal
        open={openProveedores}
        itemId={selectedItem}
        onClose={() => setOpenProveedores(false)}
      />
    </div>
  );
}

// Componente de botón de acción
function ActionButton({ title, icon, onClick }) {
  const icons = {
    location: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    ),
    history: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    chart: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    money: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2.5 text-gray-500 hover:text-[#1e3a5f] hover:bg-blue-50 rounded-lg transition-all duration-200"
    >
      {icons[icon]}
    </button>
  );
}