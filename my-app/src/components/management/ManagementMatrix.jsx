"use client";

import { useEffect, useMemo, useState } from "react";
import { maquinariaAPI } from "@/lib/api";
import { FilterInput, FilterPanel } from "@/components/ui/FilterPanel";
import {
  buildLifeMatrix,
  formatLifeHours,
  formatLifeMatrixMoney,
} from "./buildLifeMatrix";

const ITEM_TYPE_LABELS = {
  REPUESTO: "Repuesto",
  CONSUMIBLE: "Consumible",
};

export default function ManagementMatrix() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemType, setItemType] = useState("TODOS");

  useEffect(() => {
    const loadMatrix = async () => {
      try {
        setLoading(true);
        const response = await maquinariaAPI.gestionMatrix();
        setPayload(response.data);
      } catch (error) {
        console.error("Error al cargar la matriz de gestion:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMatrix();
  }, []);

  const { columns, rows, meta } = useMemo(
    () => buildLifeMatrix(payload),
    [payload]
  );

  const filteredRows = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    return rows.filter((row) => {
      if (itemType !== "TODOS" && row.tipoInsumo !== itemType) {
        return false;
      }

      if (!needle) return true;

      const haystack = `${row.itemCodigo} ${row.itemNombre} ${row.tipoInsumo}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [rows, searchTerm, itemType]);

  return (
    <div className="space-y-6">
      <FilterPanel
        title="Filtro de gestion"
        description="Busca por codigo o nombre del item y filtra por tipo de insumo."
        hasActiveFilters={Boolean(searchTerm || itemType !== "TODOS")}
        onClear={() => {
          setSearchTerm("");
          setItemType("TODOS");
        }}
      >
        <FilterInput
          label="Buscar item"
          type="text"
          placeholder="Ej. FIL-001 o Filtro"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Tipo</label>
          <select
            value={itemType}
            onChange={(event) => setItemType(event.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
          >
            <option value="TODOS">Todos</option>
            <option value="REPUESTO">Repuesto</option>
            <option value="CONSUMIBLE">Consumible</option>
          </select>
        </div>
      </FilterPanel>

      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#1e3a8a]" />
          <p className="mt-3 text-sm text-gray-600">Cargando matriz de gestion...</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="py-12 text-center">
          <h3 className="text-base font-semibold text-gray-900">
            No hay datos para mostrar
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Ajusta los filtros o espera registros historicos con horometro suficiente para calcular la vida util.
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
                      className="min-w-[190px] border-b border-gray-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-[#1e3a8a]">
                          {column.codigo}
                        </span>
                        <span className="mt-1 text-[11px] font-medium normal-case text-gray-500">
                          {column.nombre}
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
                        key={`${row.itemId}-${cell.maquinariaId}`}
                        className="border-b border-gray-200 px-4 py-4"
                      >
                        {cell.promedioVida !== null ? (
                          <div>
                            <p className="text-sm font-semibold text-[#1e3a8a]">
                              {formatLifeMatrixMoney(cell.costoTotal)}
                            </p>
                            <p className="text-sm font-semibold text-emerald-800">
                              {formatLifeHours(cell.promedioVida)}
                            </p>
                            <p className="mt-1 text-xs text-emerald-700">
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
            items con historial utilizable. Maquinarias evaluadas:{" "}
            <span className="font-medium text-gray-900">{meta.totalMaquinarias}</span>. Muestras:{" "}
            <span className="font-medium text-gray-900">{meta.totalMuestras}</span>.
          </p>
        </>
      )}
    </div>
  );
}
