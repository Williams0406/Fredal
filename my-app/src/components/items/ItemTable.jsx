"use client";

import { useEffect, useMemo, useState } from "react";
import { itemAPI } from "@/lib/api";
import ItemFormModal from "./ItemFormModal";
import ItemHistorialModal from "./ItemHistorialModal";
import ItemUbicacionModal from "./ItemUbicacionModal";
import ItemKardexModal from "./ItemKardexModal";
import ItemProveedoresModal from "./ItemProveedoresModal";
import { FilterInput, FilterPanel, FilterSelect } from "@/components/ui/FilterPanel";
import TableActionButton from "@/components/ui/TableActionButton";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function ItemTable({
  favoriteFilter = "TODOS",
  vista = "general",
  title = "Catalogo de inventario",
  description = "Resumen de items por vista",
  extraActions = null,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

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
      const params = vista && vista !== "general" ? { vista } : undefined;
      const res = await itemAPI.list(params);
      setItems(res.data);
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [vista]);

  useEffect(() => {
    setPage(1);
  }, [search, tipoFilter, volvoFilter, stockFilter, favoriteFilter, pageSize]);

  const formatStock = (item) => {
    const stockValue = Number(item.stock ?? 0);
    const currentUnit = item.unidad_medida_detalle;

    if (!currentUnit) {
      return { valor: stockValue, unidad: item.tipo_insumo === "CONSUMIBLE" ? "" : "UNID" };
    }

    return {
      valor: stockValue,
      unidad: currentUnit.simbolo || currentUnit.nombre || "",
    };
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

      const matchesFavorite =
        favoriteFilter === "TODOS"
          ? true
          : favoriteFilter === "SOLO_FAVORITOS"
            ? Boolean(item.favorito)
            : !item.favorito;

      const rawStock = Number(item.stock ?? 0);
      const matchesStock =
        stockFilter === "TODOS"
          ? true
          : stockFilter === "CON_STOCK"
            ? rawStock > 0
            : rawStock <= 0;

      return matchesSearch && matchesTipo && matchesVolvo && matchesFavorite && matchesStock;
    });
  }, [items, search, tipoFilter, volvoFilter, stockFilter, favoriteFilter]);

  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    list.sort((a, b) => {
      let left;
      let right;

      if (sortKey === "stock") {
        left = Number(a.stock ?? 0);
        right = Number(b.stock ?? 0);
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

  const toggleFavorite = async (item) => {
    const nuevoFavorito = !item.favorito;

    setItems((prev) =>
      prev.map((current) =>
        current.id === item.id ? { ...current, favorito: nuevoFavorito } : current
      )
    );

    try {
      await itemAPI.update(item.id, { ...item, favorito: nuevoFavorito });
    } catch (error) {
      console.error("No se pudo actualizar favorito:", error);
      setItems((prev) =>
        prev.map((current) =>
          current.id === item.id ? { ...current, favorito: item.favorito } : current
        )
      );
    }
  };

  const clearFilters = () => {
    setSearch("");
    setTipoFilter("TODOS");
    setVolvoFilter("TODOS");
    setStockFilter("TODOS");
  };

  const hasFilters =
    search ||
    tipoFilter !== "TODOS" ||
    volvoFilter !== "TODOS" ||
    stockFilter !== "TODOS" ||
    favoriteFilter !== "TODOS";

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-[18px] font-semibold text-[#1e3a5f]">{title}</h2>
            <p className="mt-0.5 text-[13px] text-gray-500">{description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {extraActions}
            <button
              onClick={() => {
                setEditingItem(null);
                setOpen(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-5 py-2.5 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-[#152d4a]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Item
            </button>
          </div>
        </div>

        <div className="border-b border-gray-100 px-6 py-4">
          <FilterPanel
            title="Filtros de inventario"
            description="Busca por codigo o nombre y ajusta tipo, marca, stock y tamano de pagina."
            collapsible
            hasActiveFilters={Boolean(hasFilters)}
            onClear={clearFilters}
            bodyClassName="space-y-3"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
              <FilterInput
                label="Buscar"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Codigo, nombre o tipo"
                className="lg:col-span-2"
              />

              <FilterSelect label="Tipo" value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)}>
                <option value="TODOS">Todos</option>
                <option value="REPUESTO">Repuesto</option>
                <option value="CONSUMIBLE">Consumible</option>
                <option value="HERRAMIENTA">Herramienta</option>
              </FilterSelect>

              <FilterSelect label="Volvo" value={volvoFilter} onChange={(e) => setVolvoFilter(e.target.value)}>
                <option value="TODOS">Todos</option>
                <option value="SI">Solo Volvo</option>
                <option value="NO">No Volvo</option>
              </FilterSelect>

              <FilterSelect label="Stock" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
                <option value="TODOS">Todos</option>
                <option value="CON_STOCK">Con stock</option>
                <option value="SIN_STOCK">Sin stock</option>
              </FilterSelect>

              <FilterSelect label="Mostrar" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size} por pagina</option>
                ))}
              </FilterSelect>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-500">
                Orden actual: <span className="font-semibold text-[#1e3a8a]">{sortKey}</span> ({sortDirection === "asc" ? "ascendente" : "descendente"})
              </p>
              <p className="text-xs text-gray-500">
                {sortedItems.length} de {items.length} {items.length === 1 ? "item" : "items"}
              </p>
            </div>
          </FilterPanel>
        </div>

        {loading ? (
          <div className="px-6 py-16 text-center">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#1e3a5f]"></div>
              <p className="text-[14px] text-gray-500">Cargando inventario...</p>
            </div>
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-[15px] font-medium text-gray-900">
              {sortedItems.length === 0 && hasFilters ? "No hay resultados para los filtros aplicados" : "No hay items registrados"}
            </p>
            <p className="mt-1 text-[13px] text-gray-500">Prueba cambiando filtros o crea un nuevo item.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <SortableHeader title="Codigo" sortKey="codigo" currentKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                    <SortableHeader title="Item / Descripcion" sortKey="nombre" currentKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                    <SortableHeader title="Stock" sortKey="stock" currentKey={sortKey} direction={sortDirection} onSort={toggleSort} align="center" />
                    <SortableHeader title="Tipo" sortKey="tipo_insumo" currentKey={sortKey} direction={sortDirection} onSort={toggleSort} align="center" />
                    <th className="px-6 py-4 text-center text-[13px] font-semibold uppercase tracking-wide text-gray-600">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {paginatedItems.map((item) => {
                    const stock = formatStock(item);
                    return (
                      <tr key={item.id} className="transition-colors duration-150 hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="text-[14px] font-mono font-semibold text-gray-900">{item.codigo}</code>
                            {item.volvo && (
                              <span className="inline-flex items-center rounded border border-yellow-300 bg-yellow-100 px-2 py-0.5 text-[11px] font-bold text-yellow-800">
                                VOLVO
                              </span>
                            )}
                            {item.favorito && (
                              <span className="inline-flex items-center rounded border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                ★ Favorito
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div>
                            <p className="text-[14px] font-medium text-gray-900">{item.nombre}</p>
                            <p className="mt-0.5 text-[13px] text-gray-500">Unidad: {item.unidad_medida_detalle?.nombre || "UNIDAD"}</p>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex min-w-[56px] items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                            <span className="text-[16px] font-bold text-[#1e3a5f]">{stock.valor}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-gray-500">{stock.unidad}</p>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-[12px] font-medium ${
                              item.tipo_insumo === "REPUESTO"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : item.tipo_insumo === "CONSUMIBLE"
                                  ? "border-purple-200 bg-purple-50 text-purple-700"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {item.tipo_insumo}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <ActionButton title={item.favorito ? "Quitar de favoritos" : "Marcar como favorito"} icon="favorite" active={item.favorito} onClick={() => toggleFavorite(item)} />
                            <ActionButton title="Editar item" icon="edit" onClick={() => { setEditingItem(item); setOpen(true); }} />
                            <ActionButton title="Ubicacion de unidades" icon="location" onClick={() => { setSelectedItem(item.id); setOpenUbicacion(true); }} />
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

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <p className="text-sm text-gray-600">
                Mostrando <span className="font-semibold text-[#1e3a8a]">{startIndex + 1}-{Math.min(startIndex + pageSize, sortedItems.length)}</span> de {sortedItems.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={safePage === 1}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-600">Pagina {safePage} de {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safePage === totalPages}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
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
    <th className={`px-6 py-4 text-[13px] font-semibold uppercase tracking-wide text-gray-600 ${alignClass}`}>
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

function ActionButton({ title, icon, onClick, active = false }) {
  const icons = {
    location: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    history: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    chart: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    money: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    edit: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    favorite: (
      <svg className="h-4 w-4" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.08 3.317a1 1 0 00.95.69h3.49c.969 0 1.371 1.24.588 1.81l-2.825 2.053a1 1 0 00-.364 1.118l1.08 3.318c.3.921-.755 1.688-1.54 1.118l-2.824-2.053a1 1 0 00-1.176 0l-2.824 2.053c-.785.57-1.84-.197-1.54-1.118l1.08-3.318a1 1 0 00-.364-1.118L2.98 8.744c-.783-.57-.38-1.81.588-1.81h3.49a1 1 0 00.95-.69l1.08-3.317z" />
      </svg>
    ),
  };

  return (
    <TableActionButton
      onClick={onClick}
      title={title}
      tone={active ? "active" : "neutral"}
      iconOnly
      className={!active ? "text-gray-500 hover:text-[#1e3a5f]" : ""}
    >
      {icons[icon]}
    </TableActionButton>
  );
}
