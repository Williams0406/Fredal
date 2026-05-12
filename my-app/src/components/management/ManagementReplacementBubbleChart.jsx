"use client";

import { useEffect, useMemo, useState } from "react";
import { maquinariaAPI } from "@/lib/api";

const NUMBER_FORMATTER = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const MONEY_FORMATTER = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const CHART_WIDTH = 980;
const CHART_HEIGHT = 460;
const MARGIN = {
  top: 24,
  right: 42,
  bottom: 76,
  left: 88,
};

const TYPE_COLORS = {
  REPUESTO: {
    fill: "rgba(14, 116, 144, 0.34)",
    stroke: "#0f766e",
    glow: "rgba(15, 118, 110, 0.18)",
  },
  CONSUMIBLE: {
    fill: "rgba(234, 88, 12, 0.30)",
    stroke: "#c2410c",
    glow: "rgba(194, 65, 12, 0.18)",
  },
};

function formatMoney(value) {
  return MONEY_FORMATTER.format(Number(value || 0));
}

function formatHours(value) {
  return `${NUMBER_FORMATTER.format(Number(value || 0))} h`;
}

function buildBubbleRows(rows = []) {
  return rows
    .filter(
      (row) =>
        Number(row.costo_total_compra || 0) > 0 &&
        Number(row.vida_util_promedio || 0) > 0
    )
    .sort((a, b) => {
      const costDiff = Number(b.costo_total_compra || 0) - Number(a.costo_total_compra || 0);
      if (costDiff !== 0) return costDiff;
      return Number(b.vida_util_promedio || 0) - Number(a.vida_util_promedio || 0);
    })
    .map((row) => ({
      ...row,
      tipo_insumo: row.tipo_insumo || "REPUESTO",
      color: TYPE_COLORS[row.tipo_insumo || "REPUESTO"] || TYPE_COLORS.REPUESTO,
    }));
}

function buildRadiusScale(rows = []) {
  const values = rows
    .map((row) => Number(row.duracion_ot_promedio || 0))
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (!values.length) {
    return () => 18;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return () => 20;
  }

  return (value) => {
    const numericValue = Number(value || 0);
    const ratio = (numericValue - min) / (max - min);
    return 12 + Math.max(0, ratio) * 24;
  };
}

export default function ManagementReplacementBubbleChart() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [hoveredBubbleId, setHoveredBubbleId] = useState(null);

  useEffect(() => {
    const loadBubbleChart = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const response = await maquinariaAPI.gestionBubbleRepuestos();
        setPayload(response.data);
      } catch (error) {
        console.error("Error al cargar el bubble chart de repuestos:", error);
        const apiError =
          error?.response?.data?.detail ||
          "No se pudo cargar el bubble chart de repuestos.";
        setPayload(null);
        setLoadError(apiError);
      } finally {
        setLoading(false);
      }
    };

    loadBubbleChart();
  }, []);

  const bubbleRows = useMemo(
    () => buildBubbleRows(payload?.rows || []),
    [payload]
  );

  const radiusScale = useMemo(() => buildRadiusScale(bubbleRows), [bubbleRows]);

  const totals = useMemo(() => {
    return bubbleRows.reduce(
      (acc, row) => {
        acc.costo += Number(row.costo_total_compra || 0);
        acc.vida += Number(row.vida_util_promedio || 0);
        acc.horas += Number(row.duracion_ot_promedio || 0);
        acc.muestras += Number(row.muestras || 0);
        return acc;
      },
      { costo: 0, vida: 0, horas: 0, muestras: 0 }
    );
  }, [bubbleRows]);

  const hoveredBubble =
    bubbleRows.find((row) => row.item_id === hoveredBubbleId) || null;

  if (loading) {
    return (
      <section className="space-y-3">
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#1e3a8a]" />
          <p className="mt-3 text-sm text-gray-600">
            Cargando bubble chart de repuestos...
          </p>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="space-y-3">
        <div className="py-12 text-center">
          <h3 className="text-base font-semibold text-gray-900">
            No se pudo cargar el bubble chart
          </h3>
          <p className="mt-2 text-sm text-red-600">{loadError}</p>
        </div>
      </section>
    );
  }

  if (bubbleRows.length === 0) {
    return (
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-[#1e3a8a]">
            Bubble chart de repuestos
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Cada burbuja representa un item repuesto segun vida util promedio, costo total de compra considerado y duracion promedio de sus OT.
          </p>
        </div>

        <div className="py-10 text-center">
          <h3 className="text-base font-semibold text-gray-900">
            No hay repuestos con informacion suficiente para graficar
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Necesitas historiales de repuesto con horometro_inicio y horometro_fin completos.
          </p>
        </div>
      </section>
    );
  }

  const plotWidth = CHART_WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const maxX = Math.max(...bubbleRows.map((row) => Number(row.costo_total_compra || 0)), 1) * 1.1;
  const maxY = Math.max(...bubbleRows.map((row) => Number(row.vida_util_promedio || 0)), 1) * 1.1;

  const xScale = (value) => MARGIN.left + (Number(value || 0) / maxX) * plotWidth;
  const yScale = (value) =>
    MARGIN.top + plotHeight - (Number(value || 0) / maxY) * plotHeight;

  const xTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const value = maxX * ratio;
    return {
      value,
      x: MARGIN.left + plotWidth * ratio,
    };
  });

  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const value = maxY * ratio;
    return {
      value,
      y: MARGIN.top + plotHeight - plotHeight * ratio,
    };
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#1e3a8a]">
            Bubble chart de repuestos
          </h2>
        </div>

        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">{bubbleRows.length}</span> repuestos
          {" | "}
          muestras{" "}
          <span className="font-medium text-gray-900">
            {NUMBER_FORMATTER.format(totals.muestras)}
          </span>
          {" | "}
          costo visible{" "}
          <span className="font-medium text-gray-900">{formatMoney(totals.costo)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <div className="inline-flex items-center gap-2">
          <span className="font-medium text-gray-900">
            {formatHours(
              bubbleRows.length ? totals.vida / bubbleRows.length : 0
            )}
          </span>
          <span>vida util promedio visible</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="font-medium text-gray-900">
            {formatHours(
              bubbleRows.length ? totals.horas / bubbleRows.length : 0
            )}
          </span>
          <span>duracion promedio OT visible</span>
        </div>
      </div>

      <div className="relative overflow-x-auto rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(191,219,254,0.32),_transparent_38%),linear-gradient(180deg,_rgba(248,250,252,0.96),_rgba(255,255,255,0.98))] p-4 shadow-sm">
        <svg
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="min-w-full"
          role="img"
          aria-label="Bubble chart de repuestos por costo total, vida util promedio y duracion promedio de orden de trabajo"
        >
          {yTicks.map((tick) => (
            <g key={`y-${tick.y}`}>
              <line
                x1={MARGIN.left}
                y1={tick.y}
                x2={CHART_WIDTH - MARGIN.right}
                y2={tick.y}
                stroke="#e5e7eb"
                strokeDasharray="4 4"
              />
              <text
                x={MARGIN.left - 12}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-gray-500 text-[11px]"
              >
                {formatHours(tick.value)}
              </text>
            </g>
          ))}

          {xTicks.map((tick) => (
            <g key={`x-${tick.x}`}>
              <line
                x1={tick.x}
                y1={MARGIN.top}
                x2={tick.x}
                y2={MARGIN.top + plotHeight}
                stroke="#f1f5f9"
              />
              <text
                x={tick.x}
                y={MARGIN.top + plotHeight + 24}
                textAnchor="middle"
                className="fill-gray-500 text-[11px]"
              >
                {formatMoney(tick.value)}
              </text>
            </g>
          ))}

          <line
            x1={MARGIN.left}
            y1={MARGIN.top}
            x2={MARGIN.left}
            y2={MARGIN.top + plotHeight}
            stroke="#94a3b8"
          />
          <line
            x1={MARGIN.left}
            y1={MARGIN.top + plotHeight}
            x2={CHART_WIDTH - MARGIN.right}
            y2={MARGIN.top + plotHeight}
            stroke="#94a3b8"
          />

          {bubbleRows.map((row) => {
            const x = xScale(row.costo_total_compra);
            const y = yScale(row.vida_util_promedio);
            const radius = radiusScale(row.duracion_ot_promedio);
            const isHovered = hoveredBubbleId === row.item_id;
            const tooltipWidth = 220;
            const tooltipHeight = 92;
            const tooltipX = Math.min(x + radius + 10, CHART_WIDTH - MARGIN.right - tooltipWidth - 4);
            const tooltipY = Math.max(MARGIN.top + 6, y - radius - tooltipHeight + 8);

            return (
              <g
                key={row.item_id}
                onMouseEnter={() => setHoveredBubbleId(row.item_id)}
                onMouseLeave={() => setHoveredBubbleId(null)}
                className="cursor-pointer"
              >
                <title>
                  {`${row.item_codigo} - ${row.item_nombre}: costo ${formatMoney(
                    row.costo_total_compra
                  )}, vida util ${formatHours(
                    row.vida_util_promedio
                  )}, duracion OT ${formatHours(
                    row.duracion_ot_promedio
                  )}, muestras ${NUMBER_FORMATTER.format(row.muestras)}`}
                </title>

                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? radius + 7 : radius + 3}
                  fill={row.color.glow}
                />

                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? radius + 2 : radius}
                  fill={row.color.fill}
                  stroke={row.color.stroke}
                  strokeWidth={isHovered ? "3" : "2"}
                  opacity={isHovered ? "1" : "0.94"}
                />

                {isHovered ? (
                  <g pointerEvents="none">
                    <rect
                      x={tooltipX}
                      y={tooltipY}
                      width={tooltipWidth}
                      height={tooltipHeight}
                      rx="14"
                      fill="rgba(15, 23, 42, 0.92)"
                    />
                    <text
                      x={tooltipX + 12}
                      y={tooltipY + 18}
                      className="fill-white text-[11px] font-semibold"
                    >
                      {row.item_codigo}
                    </text>
                    <text
                      x={tooltipX + 12}
                      y={tooltipY + 34}
                      className="fill-slate-200 text-[10px]"
                    >
                      {row.item_nombre}
                    </text>
                    <text
                      x={tooltipX + 12}
                      y={tooltipY + 52}
                      className="fill-slate-200 text-[10px]"
                    >
                      {`Costo: ${formatMoney(row.costo_total_compra)}`}
                    </text>
                    <text
                      x={tooltipX + 12}
                      y={tooltipY + 66}
                      className="fill-slate-200 text-[10px]"
                    >
                      {`Vida util: ${formatHours(row.vida_util_promedio)}`}
                    </text>
                    <text
                      x={tooltipX + 12}
                      y={tooltipY + 80}
                      className="fill-slate-200 text-[10px]"
                    >
                      {`OT: ${formatHours(row.duracion_ot_promedio)} · Muestras: ${NUMBER_FORMATTER.format(row.muestras)}`}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}

          <text
            x={MARGIN.left}
            y={12}
            className="fill-slate-600 text-[11px] font-semibold"
          >
            Vida util promedio
          </text>
          <text
            x={CHART_WIDTH / 2}
            y={CHART_HEIGHT - 10}
            textAnchor="middle"
            className="fill-slate-600 text-[11px] font-semibold"
          >
            Costo total de compra considerado
          </text>
        </svg>
      </div>
    </section>
  );
}
