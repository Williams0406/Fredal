"use client";

import { useEffect, useMemo, useState } from "react";
import { maquinariaAPI } from "@/lib/api";
import { FilterInput, FilterPanel } from "@/components/ui/FilterPanel";
import {
  buildProviderPurchaseMatrix,
  formatProviderLifeHours,
  formatProviderMoney,
} from "./buildProviderPurchaseMatrix";

const ITEM_TYPE_LABELS = {
  REPUESTO: "Repuesto",
  CONSUMIBLE: "Consumible",
};

function formatCostLabel(row, value) {
  const money = formatProviderMoney(value);
  if (row.tipoInsumo === "CONSUMIBLE") {
    const unidad = row.unidadSimbolo || "unidad";
    return `${money} / ${unidad}`;
  }
  return `${money} / und`;
}

export default function ManagementProviderMatrix() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadMatrix = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const response = await maquinariaAPI.gestionMatrixProveedoresRepuestos();
        setPayload(response.data);
      } catch (error) {
        console.error("Error al cargar la matriz item-proveedor:", error);
        const apiError =
          error?.response?.data?.detail ||
          "No se pudo cargar la matriz item-proveedor.";
        setPayload(null);
        setLoadError(apiError);
      } finally {
        setLoading(false);
      }
    };

    loadMatrix();
  }, []);

  const { columns, rows, meta } = useMemo(
    () => buildProviderPurchaseMatrix(payload),
    [payload]
  );

  const filteredRows = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return rows;

    return rows.filter((row) => {
      const haystack = `${row.itemCodigo} ${row.itemNombre}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [rows, searchTerm]);

  return (
    <div className="space-y-6">
      <FilterPanel
        title="Filtro de matriz item-proveedor"
        description="Busca por codigo o nombre del item para revisar su valor unitario de compra y vida util promedio por proveedor."
        hasActiveFilters={Boolean(searchTerm)}
        onClear={() => setSearchTerm("")}
      >
        <FilterInput
          label="Buscar item"
          type="text"
          placeholder="Ej. FIL-001 o Aceite"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </FilterPanel>

      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#1e3a8a]" />
          <p className="mt-3 text-sm text-gray-600">
            Cargando matriz item-proveedor...
          </p>
        </div>
      ) : loadError ? (
        <div className="py-12 text-center">
          <h3 className="text-base font-semibold text-gray-900">
            No se pudo cargar la matriz
          </h3>
          <p className="mt-2 text-sm text-red-600">{loadError}</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="py-12 text-center">
          <h3 className="text-base font-semibold text-gray-900">
            No hay items para mostrar
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Ajusta el filtro o espera historiales con horometro inicial y final completos.
          </p>
        </div>
      ) : (
        <>
          <div className="relative isolate z-0 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-[3] min-w-[260px] border-b border-r border-gray-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Item
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      className="min-w-[220px] border-b border-gray-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-[#1e3a8a]">{column.nombre}</span>
                        <span className="mt-1 text-[11px] font-medium normal-case text-gray-500">
                          {column.ruc || "Sin RUC"}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.itemId} className="align-top">
                    <td className="sticky left-0 z-[2] border-b border-r border-gray-200 bg-white px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[#1e3a8a]">
                            {row.itemCodigo}
                          </p>
                          <p className="text-sm text-gray-700">{row.itemNombre}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                            {ITEM_TYPE_LABELS[row.tipoInsumo] || row.tipoInsumo}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                            {row.muestras} muestras
                          </span>
                        </div>
                      </div>
                    </td>

                    {row.cells.map((cell) => (
                      <td
                        key={`${row.itemId}-${cell.proveedorId}`}
                        className="border-b border-gray-200 px-4 py-4"
                      >
                        {cell.promedioValorUnitario !== null && cell.promedioVidaUtil !== null ? (
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-[#1e3a8a]">
                              {formatCostLabel(row, cell.promedioValorUnitario)}
                            </p>
                            <p className="text-sm font-semibold text-emerald-800">
                              {formatProviderLifeHours(cell.promedioVidaUtil)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {cell.muestras} {cell.muestras === 1 ? "registro" : "registros"}
                            </p>
                          </div>
                        ) : (
                          <div className="text-xs font-medium text-gray-400">
                            Sin data
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-600">
            Mostrando{" "}
            <span className="font-medium text-gray-900">{filteredRows.length}</span>{" "}
            de{" "}
            <span className="font-medium text-gray-900">{rows.length}</span>{" "}
            items. Proveedores evaluados:{" "}
            <span className="font-medium text-gray-900">{meta.totalProveedores}</span>. Muestras:{" "}
            <span className="font-medium text-gray-900">{meta.totalMuestras}</span>.
          </p>
        </>
      )}
    </div>
  );
}
