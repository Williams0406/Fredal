"use client";

import { useEffect, useMemo, useState } from "react";
import { itemAPI, unidadMedidaAPI, unidadRelacionAPI } from "@/lib/api";
import ItemFormModal from "./ItemFormModal";
import ItemHistorialModal from "./ItemHistorialModal";
import ItemUbicacionModal from "./ItemUbicacionModal";
import ItemKardexModal from "./ItemKardexModal";
import ItemProveedoresModal from "./ItemProveedoresModal";
import {
  Boxes,
  Wrench,
  FlaskConical,
  BadgeCheck,
  BarChart3
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function ItemTable() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [unidades, setUnidades] = useState([]);
  const [relaciones, setRelaciones] = useState([]);
  const [displayUnitId, setDisplayUnitId] = useState("");

  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [openHistorial, setOpenHistorial] = useState(false);
  const [openUbicacion, setOpenUbicacion] = useState(false);
  const [openKardex, setOpenKardex] = useState(false);
  const [openProveedores, setOpenProveedores] = useState(false);

  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("TODOS");
  const [volvoFilter, setVolvoFilter] = useState("TODOS");
  const [stockFilter, setStockFilter] = useState("TODOS");
  const [sortKey, setSortKey] = useState("nombre");
  const [sortDirection, setSortDirection] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    return () => window.removeEventListener("stockDisplayChange", handleDisplayChange);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, tipoFilter, volvoFilter, stockFilter, pageSize]);

  const displayUnit = unidades.find((u) => String(u.id) === String(displayUnitId));
  const baseUnitForDimension = (dimensionId) =>
    unidades.find((u) => u.dimension === dimensionId && u.es_base);
  const relationForUnits = (baseUnitId, relatedUnitId) =>
    relaciones.find((rel) => rel.unidad_base === baseUnitId && rel.unidad_relacionada === relatedUnitId);
  
  const getBaseFactor = (baseUnitId, targetUnitId) => {
    if (baseUnitId === targetUnitId) return 1;
    const relacion = relationForUnits(baseUnitId, targetUnitId);
    if (!relacion) return null;
    return Number(relacion.factor);
  };

  const convertStockValue = (stockValue, fromUnit, toUnit, dimensionId) => {
    if (!fromUnit || !toUnit || fromUnit.id === toUnit.id) return Number(stockValue);
    const baseUnit = baseUnitForDimension(dimensionId);
    if (!baseUnit) return Number(stockValue);

    const factorFromBase = getBaseFactor(baseUnit.id, fromUnit.id);
    const factorToBase = fromUnit.id === baseUnit.id ? 1 : factorFromBase ? 1 / factorFromBase : null;
    const factorBaseToTarget = getBaseFactor(baseUnit.id, toUnit.id);

    if (factorToBase === null || factorBaseToTarget === null) return Number(stockValue);

    return Number(stockValue) * factorToBase * factorBaseToTarget;
  };

  const formatStock = (item) => {
    const stockValue = Number(item.stock ?? item.unidades_disponibles ?? 0);
    if (item.tipo_insumo !== "CONSUMIBLE") {
      return { valor: stockValue, unidad: "UNID" };
    }

    const currentUnit =
      item.unidad_medida_detalle ||
      unidades.find((unidad) => String(unidad.id) === String(item.unidad_medida)) ||
      item.unidad_base;

    if (!currentUnit) return { valor: stockValue, unidad: "" };

    if (displayUnit && displayUnit.dimension === item.dimension && displayUnit.id !== currentUnit.id) {
      const valor = convertStockValue(stockValue, currentUnit, displayUnit, item.dimension);
      return { valor: Number(valor.toFixed(2)), unidad: displayUnit.simbolo || displayUnit.nombre };
    }

    return { valor: stockValue, unidad: currentUnit.simbolo || currentUnit.nombre };
  };

  const stats = {
    total: items.length,
    repuestos: items.filter((i) => i.tipo_insumo === "REPUESTO").length,
    consumibles: items.filter((i) => i.tipo_insumo === "CONSUMIBLE").length,
    volvo: items.filter((i) => i.volvo).length,
    totalUnidades: items.reduce((sum, i) => sum + Number(i.stock ?? i.unidades_disponibles ?? 0), 0),
  };

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = !term
        ? true
        : `${item.codigo} ${item.nombre} ${item.tipo_insumo}`.toLowerCase().includes(term);

      const matchesTipo = tipoFilter === "TODOS" ? true : item.tipo_insumo === tipoFilter;
      const matchesVolvo =
        volvoFilter === "TODOS" ? true : volvoFilter === "SI" ? Boolean(item.volvo) : !item.volvo;

      const rawStock = Number(item.stock ?? item.unidades_disponibles ?? 0);
      const matchesStock =
        stockFilter === "TODOS"
          ? true
          : stockFilter === "CON_STOCK"
          ? rawStock > 0
          : rawStock <= 0;

      return matchesSearch && matchesTipo && matchesVolvo && matchesStock;
    });
  }, [items, search, tipoFilter, volvoFilter, stockFilter]);

  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    list.sort((a, b) => {
      let left;
      let right;

      if (sortKey === "stock") {
        left = Number(a.stock ?? a.unidades_disponibles ?? 0);
        right = Number(b.stock ?? b.unidades_disponibles ?? 0);
      } else if (sortKey === "tipo_insumo") {
        left = a.tipo_insumo || "";
        right = b.tipo_insumo || "";
      } else if (sortKey === "codigo") {
        left = a.codigo || "";
        right = b.codigo || "";
      } else {
        left = a.nombre || "";
        right = b.nombre || "";
      }

      const compare = typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), "es", { sensitivity: "base" });

      return sortDirection === "asc" ? compare : -compare;
    });

    return list;
  }, [filteredItems, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedItems = sortedItems.slice(startIndex, startIndex + pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const clearFilters = () => {
    setSearch("");
    setTipoFilter("TODOS");
    setVolvoFilter("TODOS");
    setStockFilter("TODOS");
  };

  const hasFilters = search || tipoFilter !== "TODOS" || volvoFilter !== "TODOS" || stockFilter !== "TODOS";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <StatCard title="Total Items" value={stats.total} color="text-[#1e3a5f]" bg="bg-blue-50" icon="box" />
        <StatCard title="Repuestos" value={stats.repuestos} color="text-[#1e3a5f]" bg="bg-blue-50" icon="tool" />
        <StatCard title="Consumibles" value={stats.consumibles} color="text-purple-600" bg="bg-purple-50" icon="pack" />
        <StatCard title="Volvo OEM" value={stats.volvo} color="text-yellow-600" bg="bg-yellow-50" icon="badge" />
        <StatCard title="Unidades" value={stats.totalUnidades} color="text-[#84cc16]" bg="bg-green-50" icon="chart" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-semibold text-[#1e3a5f]">Catálogo de inventario</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">
              {sortedItems.length} de {items.length} {items.length === 1 ? "item" : "items"}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingItem(null);
              setOpen(true);
            }}
            className="px-5 py-2.5 bg-[#1e3a5f] text-white text-[14px] font-medium rounded-lg hover:bg-[#152d4a] transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Item
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-blue-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Buscar</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Código, nombre o tipo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label>
              <select
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a8a]"
              >
                <option value="TODOS">Todos</option>
                <option value="REPUESTO">Repuesto</option>
                <option value="CONSUMIBLE">Consumible</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Volvo</label>
              <select
                value={volvoFilter}
                onChange={(e) => setVolvoFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a8a]"
              >
                <option value="TODOS">Todos</option>
                <option value="SI">Solo Volvo</option>
                <option value="NO">No Volvo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Stock</label>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a8a]"
              >
                <option value="TODOS">Todos</option>
                <option value="CON_STOCK">Con stock</option>
                <option value="SIN_STOCK">Sin stock</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Mostrar</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a8a]"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size} por página</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              Orden actual: <span className="font-semibold text-[#1e3a8a]">{sortKey}</span> ({sortDirection === "asc" ? "ascendente" : "descendente"})
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-1.5 rounded-lg"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-16 text-center">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1e3a5f] rounded-full animate-spin"></div>
              <p className="text-[14px] text-gray-500">Cargando inventario...</p>
            </div>
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-[15px] font-medium text-gray-900">
              {sortedItems.length === 0 && hasFilters ? "No hay resultados para los filtros aplicados" : "No hay items registrados"}
            </p>
            <p className="text-[13px] text-gray-500 mt-1">Prueba cambiando filtros o crea un nuevo item.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <SortableHeader title="Código" sortKey="codigo" currentKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                    <SortableHeader title="Item / Descripción" sortKey="nombre" currentKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                    <SortableHeader title="Stock" sortKey="stock" currentKey={sortKey} direction={sortDirection} onSort={toggleSort} align="center" />
                    <SortableHeader title="Tipo" sortKey="tipo_insumo" currentKey={sortKey} direction={sortDirection} onSort={toggleSort} align="center" />
                    <th className="px-6 py-4 text-center text-[13px] font-semibold text-gray-600 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {paginatedItems.map((item) => {
                    const stock = formatStock(item);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="text-[14px] font-mono font-semibold text-gray-900">{item.codigo}</code>
                            {item.volvo && (
                              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold bg-yellow-100 text-yellow-800 rounded border border-yellow-300">
                                VOLVO
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div>
                            <p className="text-[14px] font-medium text-gray-900">{item.nombre}</p>
                            <p className="text-[13px] text-gray-500 mt-0.5">Unidad: {item.unidad_medida_detalle?.nombre || "UNIDAD"}</p>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center justify-center min-w-[56px] px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
                            <span className="text-[16px] font-bold text-[#1e3a5f]">{stock.valor}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-gray-500">{stock.unidad}</p>
                        </td>

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

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <ActionButton title="Editar item" icon="edit" onClick={() => { setEditingItem(item); setOpen(true); }} />
                            <ActionButton title="Ubicación de unidades" icon="location" onClick={() => { setSelectedItem(item.id); setOpenUbicacion(true); }} />
                            <ActionButton title="Historial de movimientos" icon="history" onClick={() => { setSelectedItem(item.id); setOpenHistorial(true); }} />
                            <ActionButton title="Kardex contable" icon="chart" onClick={() => { setSelectedItem(item.id); setOpenKardex(true); }} />
                            <ActionButton title="Proveedores y precios" icon="money" onClick={() => { setSelectedItem(item.id); setOpenProveedores(true); }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                Mostrando <span className="font-semibold text-[#1e3a8a]">{startIndex + 1}-{Math.min(startIndex + pageSize, sortedItems.length)}</span> de {sortedItems.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={safePage === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-600">Página {safePage} de {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safePage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ItemFormModal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditingItem(null);
        }}
        onSaved={loadItems}
        item={editingItem}
      />

      <ItemHistorialModal open={openHistorial} itemId={selectedItem} onClose={() => setOpenHistorial(false)} />
      <ItemUbicacionModal open={openUbicacion} itemId={selectedItem} onClose={() => setOpenUbicacion(false)} />
      <ItemKardexModal open={openKardex} itemId={selectedItem} onClose={() => setOpenKardex(false)} />
      <ItemProveedoresModal open={openProveedores} itemId={selectedItem} onClose={() => setOpenProveedores(false)} />
    </div>
  );
}

function SortableHeader({ title, sortKey, currentKey, direction, onSort, align = "left" }) {
  const isActive = currentKey === sortKey;
  const alignClass = align === "center" ? "text-center" : "text-left";

  return (
    <th className={`px-6 py-4 ${alignClass} text-[13px] font-semibold text-gray-600 uppercase tracking-wide`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 ${align === "center" ? "justify-center" : ""} ${isActive ? "text-[#1e3a8a]" : ""}`}
      >
        {title}
        <span className="text-xs">{isActive ? (direction === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}

const STAT_CONFIG = {
  box: {
    icon: Boxes,
    iconColor: "text-blue-700",
    bg: "bg-blue-100",
  },
  tool: {
    icon: Wrench,
    iconColor: "text-slate-700",
    bg: "bg-slate-100",
  },
  pack: {
    icon: FlaskConical,
    iconColor: "text-purple-700",
    bg: "bg-purple-100",
  },
  badge: {
    icon: BadgeCheck,
    iconColor: "text-amber-700",
    bg: "bg-amber-100",
  },
  chart: {
    icon: BarChart3,
    iconColor: "text-green-700",
    bg: "bg-green-100",
  },
};

function StatCard({ title, value, color, icon }) {
  const config = STAT_CONFIG[icon];
  const Icon = config.icon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
            {title}
          </p>
          <p className={`text-[32px] font-semibold mt-2 ${color}`}>
            {value}
          </p>
        </div>

        {/* Icon container */}
        <div
          className={`
            w-12 h-12 rounded-xl flex items-center justify-center
            ${config.bg}
          `}
        >
          <Icon className={`w-6 h-6 ${config.iconColor}`} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}

function ActionButton({ title, icon, onClick }) {
  const icons = {
    location: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    history: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    chart: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    money: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    edit: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <button onClick={onClick} title={title} className="p-2.5 text-gray-500 hover:text-[#1e3a5f] hover:bg-blue-50 rounded-lg transition-all duration-200">
      {icons[icon]}
    </button>
  );
}