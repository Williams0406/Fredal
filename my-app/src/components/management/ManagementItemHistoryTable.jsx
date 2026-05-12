"use client";

import { useEffect, useMemo, useState } from "react";
import { maquinariaAPI } from "@/lib/api";
import { FilterInput, FilterPanel, FilterSelect } from "@/components/ui/FilterPanel";
import {
  buildItemHistorySummary,
  formatHistoryQuantity,
  formatMoney,
} from "./buildItemHistorySummary";
import ManagementParetoChart from "./ManagementParetoChart";
import ManagementCostParetoChart from "./ManagementCostParetoChart";

const ITEM_TYPE_LABELS = {
  REPUESTO: "Repuesto",
  CONSUMIBLE: "Consumible",
};

export default function ManagementItemHistoryTable() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [itemType, setItemType] = useState("TODOS");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const params = {};
        if (fechaDesde) params.fecha_desde = fechaDesde;
        if (fechaHasta) params.fecha_hasta = fechaHasta;

        const response = await maquinariaAPI.gestionHistorialItems(params);
        setPayload(response.data);
      } catch (error) {
        console.error("Error al cargar el resumen historico por item:", error);
        const fechaHastaError = error?.response?.data?.fecha_hasta;
        const fechaDesdeError = error?.response?.data?.fecha_desde;
        const apiError =
          (Array.isArray(fechaHastaError) ? fechaHastaError[0] : fechaHastaError) ||
          (Array.isArray(fechaDesdeError) ? fechaDesdeError[0] : fechaDesdeError) ||
          error?.response?.data?.detail ||
          "No se pudo cargar el resumen historico por item.";
        setPayload(null);
        setLoadError(apiError);
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [fechaDesde, fechaHasta]);

  const { rows, meta } = useMemo(() => buildItemHistorySummary(payload), [payload]);

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

  const totalValorFiltrado = useMemo(
    () => filteredRows.reduce((acc, row) => acc + row.valorMonetario, 0),
    [filteredRows]
  );

  return (
    <div className="space-y-6">
      <FilterPanel
        title="Filtro de historial por item"
        description="Busca por codigo o nombre, filtra por tipo y opcionalmente por la fecha de la orden de trabajo."
        hasActiveFilters={Boolean(searchTerm || itemType !== "TODOS" || fechaDesde || fechaHasta)}
        onClear={() => {
          setSearchTerm("");
          setItemType("TODOS");
          setFechaDesde("");
          setFechaHasta("");
        }}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterInput
            label="Buscar item"
            type="text"
            placeholder="Ej. DEMO-REP-001 o Aceite"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          <FilterSelect
            label="Tipo"
            value={itemType}
            onChange={(event) => setItemType(event.target.value)}
          >
            <option value="TODOS">Todos</option>
            <option value="REPUESTO">Repuesto</option>
            <option value="CONSUMIBLE">Consumible</option>
          </FilterSelect>

          <FilterInput
            label="Fecha desde"
            type="date"
            value={fechaDesde}
            max={fechaHasta || undefined}
            onChange={(event) => setFechaDesde(event.target.value)}
          />

          <FilterInput
            label="Fecha hasta"
            type="date"
            value={fechaHasta}
            min={fechaDesde || undefined}
            onChange={(event) => setFechaHasta(event.target.value)}
          />
        </div>
      </FilterPanel>

      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#1e3a8a]" />
          <p className="mt-3 text-sm text-gray-600">
            Cargando resumen de historiales...
          </p>
        </div>
      ) : loadError ? (
        <div className="py-12 text-center">
          <h3 className="text-base font-semibold text-gray-900">
            No se pudo cargar el resumen
          </h3>
          <p className="mt-2 text-sm text-red-600">{loadError}</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="py-12 text-center">
          <h3 className="text-base font-semibold text-gray-900">
            No hay items para mostrar
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Ajusta los filtros para encontrar items del catalogo o espera historiales cerrados con horometro.
          </p>
        </div>
      ) : (
        <>
          <ManagementParetoChart rows={filteredRows} />
          <ManagementCostParetoChart rows={filteredRows} />

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Item
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Cantidad
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Valor monetario
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredRows.map((row) => (
                  <tr key={row.itemId} className="align-top">
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[#1e3a8a]">
                            {row.itemCodigo}
                          </p>
                          <p className="text-sm text-gray-700">{row.itemNombre}</p>
                        </div>
                        <div>
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                            {ITEM_TYPE_LABELS[row.tipoInsumo] || row.tipoInsumo}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatHistoryQuantity(row)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {row.cantidad > 0
                            ? "Acumulado desde historiales con horometro final."
                            : "Sin historiales cerrados para este item."}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatMoney(row.valorMonetario)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Suma valorizada de los historiales considerados.
                        </p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-1 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
            <p>
              Mostrando{" "}
              <span className="font-medium text-gray-900">{filteredRows.length}</span>{" "}
              de{" "}
              <span className="font-medium text-gray-900">{rows.length}</span>{" "}
              items del catalogo. Con historial:{" "}
              <span className="font-medium text-gray-900">{meta.itemsConHistorial}</span>.
              Valor visible:{" "}
              <span className="font-medium text-gray-900">{formatMoney(totalValorFiltrado)}</span>.
            </p>
            <p>
              Rango OT:{" "}
              {meta.fechaDesde || meta.fechaHasta ? (
                <>
                  <span className="font-medium text-gray-900">
                    {meta.fechaDesde || "Inicio"}
                  </span>{" "}
                  a{" "}
                  <span className="font-medium text-gray-900">
                    {meta.fechaHasta || "Sin limite"}
                  </span>
                </>
              ) : (
                <span className="font-medium text-gray-900">Todo el historial</span>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
