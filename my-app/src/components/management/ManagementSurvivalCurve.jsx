"use client";

import { useEffect, useMemo, useState } from "react";
import { maquinariaAPI } from "@/lib/api";
import { FilterPanel, FilterSelect } from "@/components/ui/FilterPanel";

const NUMBER_FORMATTER = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const PERCENT_FORMATTER = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const CHART_WIDTH = 960;
const CHART_HEIGHT = 360;
const MARGIN = {
  top: 20,
  right: 26,
  bottom: 64,
  left: 60,
};

function buildSmoothPath(points = []) {
  if (!points.length) return "";
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;

    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  return path;
}

function buildCurveGeometry(events = []) {
  if (!events.length) {
    return {
      path: "",
      dots: [],
      xTicks: [],
      yTicks: [0, 25, 50, 75, 100],
      chartWidth: CHART_WIDTH,
      plotHeight: CHART_HEIGHT - MARGIN.top - MARGIN.bottom,
      plotWidth: CHART_WIDTH - MARGIN.left - MARGIN.right,
    };
  }

  const chartWidth = Math.max(CHART_WIDTH, events.length * 92);
  const plotWidth = chartWidth - MARGIN.left - MARGIN.right;
  const plotHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

  let minHorometro = Number(events[0].horometro);
  let maxHorometro = Number(events[events.length - 1].horometro);

  if (minHorometro === maxHorometro) {
    minHorometro = Math.max(0, minHorometro - 1);
    maxHorometro += 1;
  }

  const xScale = (value) =>
    MARGIN.left + ((Number(value) - minHorometro) / (maxHorometro - minHorometro)) * plotWidth;
  const yScale = (value) => MARGIN.top + plotHeight - (Number(value) / 100) * plotHeight;

  const dots = [];
  const firstX = xScale(events[0].horometro);
  const curvePoints = [{ x: firstX, y: yScale(100) }];

  events.forEach((event) => {
    const x = xScale(event.horometro);
    const y = yScale(event.porcentaje_supervivencia);

    curvePoints.push({ x, y });
    dots.push({
      x,
      y,
      horometro: Number(event.horometro),
      cantidadRestante: Number(event.cantidad_restante),
      supervivencia: Number(event.porcentaje_supervivencia),
      fallas: Number(event.fallas),
    });
  });

  const path = buildSmoothPath(curvePoints);

  const xTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const value = minHorometro + (maxHorometro - minHorometro) * ratio;
    return {
      value,
      x: MARGIN.left + plotWidth * ratio,
    };
  });

  return {
    path,
    dots,
    xTicks,
    yTicks: [0, 25, 50, 75, 100],
    chartWidth,
    plotHeight,
    plotWidth,
  };
}

export default function ManagementSurvivalCurve() {
  const [payload, setPayload] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const loadCurve = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const params = selectedItemId ? { item_id: selectedItemId } : undefined;
        const response = await maquinariaAPI.gestionSupervivenciaRepuestos(params);
        setPayload(response.data);

        if (!selectedItemId && response.data?.selected_item?.id) {
          setSelectedItemId(String(response.data.selected_item.id));
        }
      } catch (error) {
        console.error("Error al cargar la curva de supervivencia:", error);
        const itemError = error?.response?.data?.item_id;
        const apiError =
          (Array.isArray(itemError) ? itemError[0] : itemError) ||
          error?.response?.data?.detail ||
          "No se pudo cargar la curva de supervivencia.";
        setPayload(null);
        setLoadError(apiError);
      } finally {
        setLoading(false);
      }
    };

    loadCurve();
  }, [selectedItemId]);

  const items = payload?.items || [];
  const selectedItem = payload?.selected_item || null;
  const curve = payload?.curve || [];
  const totalRegistros = Number(payload?.meta?.total_registros || 0);

  const geometry = useMemo(() => buildCurveGeometry(curve), [curve]);

  return (
    <section className="space-y-5">
      <FilterPanel
        title="Curva de vida util de repuestos"
        description="Selecciona un repuesto y revisa su curva de supervivencia segun los horometros finales registrados."
        hasActiveFilters={Boolean(selectedItemId)}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FilterSelect
            label="Item repuesto"
            value={selectedItemId}
            onChange={(event) => setSelectedItemId(event.target.value)}
          >
            {items.length === 0 ? (
              <option value="">Sin repuestos con historiales</option>
            ) : null}

            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.codigo} - {item.nombre}
              </option>
            ))}
          </FilterSelect>
        </div>
      </FilterPanel>

      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#1e3a8a]" />
          <p className="mt-3 text-sm text-gray-600">
            Cargando curva de supervivencia...
          </p>
        </div>
      ) : loadError ? (
        <div className="py-12 text-center">
          <h3 className="text-base font-semibold text-gray-900">
            No se pudo cargar la curva
          </h3>
          <p className="mt-2 text-sm text-red-600">{loadError}</p>
        </div>
      ) : !selectedItem ? (
        <div className="py-12 text-center">
          <h3 className="text-base font-semibold text-gray-900">
            No hay repuestos con historiales cerrados
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Cuando existan repuestos con horometro final, apareceran aqui para analizar su supervivencia.
          </p>
        </div>
      ) : curve.length === 0 ? (
        <div className="py-12 text-center">
          <h3 className="text-base font-semibold text-gray-900">
            Este repuesto todavia no tiene curva utilizable
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Necesitas historiales con horometro final para construir el porcentaje de supervivencia.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
            <p>
              Item:{" "}
              <span className="font-medium text-gray-900">
                {selectedItem.codigo} - {selectedItem.nombre}
              </span>
            </p>
            <p>
              Registros cerrados:{" "}
              <span className="font-medium text-gray-900">{totalRegistros}</span>
            </p>
          </div>

          <div className="overflow-x-auto">
            <svg
              width={geometry.chartWidth}
              height={CHART_HEIGHT}
              viewBox={`0 0 ${geometry.chartWidth} ${CHART_HEIGHT}`}
              className="min-w-full"
              role="img"
              aria-label="Curva de supervivencia de repuestos"
            >
              {geometry.yTicks.map((tick) => {
                const y = MARGIN.top + geometry.plotHeight - (tick / 100) * geometry.plotHeight;
                return (
                  <g key={`y-${tick}`}>
                    <line
                      x1={MARGIN.left}
                      y1={y}
                      x2={geometry.chartWidth - MARGIN.right}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={MARGIN.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-gray-500 text-[11px]"
                    >
                      {tick}%
                    </text>
                  </g>
                );
              })}

              {geometry.xTicks.map((tick) => (
                <g key={`x-${tick.x}`}>
                  <line
                    x1={tick.x}
                    y1={MARGIN.top}
                    x2={tick.x}
                    y2={MARGIN.top + geometry.plotHeight}
                    stroke="#f1f5f9"
                  />
                  <text
                    x={tick.x}
                    y={MARGIN.top + geometry.plotHeight + 24}
                    textAnchor="middle"
                    className="fill-gray-500 text-[11px]"
                  >
                    {NUMBER_FORMATTER.format(tick.value)}
                  </text>
                </g>
              ))}

              <line
                x1={MARGIN.left}
                y1={MARGIN.top}
                x2={MARGIN.left}
                y2={MARGIN.top + geometry.plotHeight}
                stroke="#94a3b8"
              />
              <line
                x1={MARGIN.left}
                y1={MARGIN.top + geometry.plotHeight}
                x2={geometry.chartWidth - MARGIN.right}
                y2={MARGIN.top + geometry.plotHeight}
                stroke="#94a3b8"
              />

              <path
                d={geometry.path}
                fill="none"
                stroke="#1e3a8a"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {geometry.dots.map((dot, index) => (
                <g key={`${dot.horometro}-${index}`}>
                  <title>
                    {`Horometro ${NUMBER_FORMATTER.format(dot.horometro)}: supervivencia ${PERCENT_FORMATTER.format(
                      dot.supervivencia
                    )}%, restante ${NUMBER_FORMATTER.format(dot.cantidadRestante)}, fallas ${dot.fallas}`}
                  </title>
                  <circle cx={dot.x} cy={dot.y} r="4" fill="#1e3a8a" />
                </g>
              ))}

              <text
                x={MARGIN.left}
                y={12}
                className="fill-slate-600 text-[11px] font-semibold"
              >
                % Supervivencia
              </text>
              <text
                x={geometry.chartWidth / 2}
                y={CHART_HEIGHT - 10}
                textAnchor="middle"
                className="fill-slate-600 text-[11px] font-semibold"
              >
                Horometro
              </text>
            </svg>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Horometro
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Fallas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Cantidad restante
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    % Supervivencia
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {curve.map((point, index) => (
                  <tr key={`${point.horometro}-${index}`}>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {NUMBER_FORMATTER.format(point.horometro)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {NUMBER_FORMATTER.format(point.fallas)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {NUMBER_FORMATTER.format(point.cantidad_restante)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[#1e3a8a]">
                      {PERCENT_FORMATTER.format(point.porcentaje_supervivencia)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
