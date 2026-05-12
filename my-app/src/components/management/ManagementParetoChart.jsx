"use client";

import { useMemo } from "react";

const PERCENT_FORMATTER = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const NUMBER_FORMATTER = new Intl.NumberFormat("es-PE", {
  maximumFractionDigits: 2,
});

const CHART_WIDTH = 960;
const CHART_HEIGHT = 380;
const MARGIN = {
  top: 20,
  right: 70,
  bottom: 120,
  left: 56,
};

function buildParetoData(rows = []) {
  const repuestos = rows
    .filter((row) => row.tipoInsumo === "REPUESTO" && Number(row.cantidad || 0) > 0)
    .sort((a, b) => Number(b.cantidad || 0) - Number(a.cantidad || 0));

  const totalCantidad = repuestos.reduce((acc, row) => acc + Number(row.cantidad || 0), 0);
  let acumulado = 0;

  return {
    totalCantidad,
    items: repuestos.map((row) => {
      const cantidad = Number(row.cantidad || 0);
      const porcentaje = totalCantidad > 0 ? (cantidad / totalCantidad) * 100 : 0;
      acumulado += porcentaje;

      return {
        itemId: row.itemId,
        itemCodigo: row.itemCodigo,
        itemNombre: row.itemNombre,
        cantidad,
        porcentaje,
        porcentajeAcumulado: Math.min(acumulado, 100),
      };
    }),
  };
}

export default function ManagementParetoChart({ rows = [] }) {
  const { items, totalCantidad } = useMemo(() => buildParetoData(rows), [rows]);

  const chartWidth = Math.max(CHART_WIDTH, items.length * 88);
  const plotWidth = chartWidth - MARGIN.left - MARGIN.right;
  const plotHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const maxCantidad = Math.max(...items.map((item) => item.cantidad), 1);
  const slotWidth = items.length > 0 ? plotWidth / items.length : plotWidth;
  const barWidth = Math.max(24, slotWidth * 0.5);

  const linePoints = items
    .map((item, index) => {
      const centerX = MARGIN.left + index * slotWidth + slotWidth / 2;
      const pointY = MARGIN.top + plotHeight - (item.porcentajeAcumulado / 100) * plotHeight;
      return `${centerX},${pointY}`;
    })
    .join(" ");

  const leftAxisTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const value = maxCantidad * (1 - ratio);
    const y = MARGIN.top + plotHeight * ratio;
    return {
      value,
      y,
    };
  });

  const rightAxisTicks = [0, 25, 50, 75, 100].map((value) => ({
    value,
    y: MARGIN.top + plotHeight - (value / 100) * plotHeight,
  }));

  if (items.length === 0) {
    return (
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-[#1e3a8a]">Pareto de repuestos</h2>
          <p className="mt-1 text-sm text-gray-600">
            Distribucion de repuestos cerrados por cantidad y porcentaje acumulado.
          </p>
        </div>

        <div className="py-10 text-center">
          <h3 className="text-base font-semibold text-gray-900">
            No hay repuestos con historial para graficar
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Ajusta los filtros actuales o espera historiales de repuestos con cantidad mayor a cero.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#1e3a8a]">Pareto de repuestos</h2>
          <p className="mt-1 text-sm text-gray-600">
            Las barras muestran la cantidad por item y la linea el porcentaje acumulado.
          </p>
        </div>

        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">{items.length}</span> repuestos con historial
          {" Â· "}
          total cantidad{" "}
          <span className="font-medium text-gray-900">
            {NUMBER_FORMATTER.format(totalCantidad)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <div className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-[#1e3a8a]" />
          <span>Cantidad</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="h-[2px] w-6 bg-emerald-600" />
          <span>Porcentaje acumulado</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={chartWidth}
          height={CHART_HEIGHT}
          viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
          className="min-w-full"
          role="img"
          aria-label="Grafico pareto de repuestos por cantidad y porcentaje acumulado"
        >
          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={plotWidth}
            height={plotHeight}
            fill="transparent"
          />

          {leftAxisTicks.map((tick) => (
            <g key={`left-${tick.y}`}>
              <line
                x1={MARGIN.left}
                y1={tick.y}
                x2={chartWidth - MARGIN.right}
                y2={tick.y}
                stroke="#e5e7eb"
                strokeDasharray="4 4"
              />
              <text
                x={MARGIN.left - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-gray-500 text-[11px]"
              >
                {NUMBER_FORMATTER.format(tick.value)}
              </text>
            </g>
          ))}

          {rightAxisTicks.map((tick) => (
            <text
              key={`right-${tick.value}`}
              x={chartWidth - MARGIN.right + 10}
              y={tick.y + 4}
              textAnchor="start"
              className="fill-emerald-700 text-[11px]"
            >
              {tick.value}%
            </text>
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
            x2={chartWidth - MARGIN.right}
            y2={MARGIN.top + plotHeight}
            stroke="#94a3b8"
          />
          <line
            x1={chartWidth - MARGIN.right}
            y1={MARGIN.top}
            x2={chartWidth - MARGIN.right}
            y2={MARGIN.top + plotHeight}
            stroke="#a7f3d0"
          />

          {items.map((item, index) => {
            const x = MARGIN.left + index * slotWidth + (slotWidth - barWidth) / 2;
            const barHeight = (item.cantidad / maxCantidad) * plotHeight;
            const y = MARGIN.top + plotHeight - barHeight;
            const centerX = x + barWidth / 2;
            const lineY = MARGIN.top + plotHeight - (item.porcentajeAcumulado / 100) * plotHeight;

            return (
              <g key={item.itemId}>
                <title>
                  {`${item.itemCodigo} - ${item.itemNombre}: ${NUMBER_FORMATTER.format(
                    item.cantidad
                  )} (${PERCENT_FORMATTER.format(item.porcentajeAcumulado)}% acumulado)`}
                </title>

                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, 2)}
                  rx="6"
                  fill="#1e3a8a"
                  opacity="0.9"
                />

                <text
                  x={centerX}
                  y={y - 8}
                  textAnchor="middle"
                  className="fill-slate-700 text-[11px] font-semibold"
                >
                  {NUMBER_FORMATTER.format(item.cantidad)}
                </text>

                <circle cx={centerX} cy={lineY} r="4" fill="#059669" />

                <text
                  x={centerX}
                  y={MARGIN.top + plotHeight + 18}
                  transform={`rotate(-42 ${centerX} ${MARGIN.top + plotHeight + 18})`}
                  textAnchor="end"
                  className="fill-gray-600 text-[11px]"
                >
                  {item.itemCodigo}
                </text>
              </g>
            );
          })}

          <polyline
            fill="none"
            stroke="#059669"
            strokeWidth="3"
            points={linePoints}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          <text
            x={MARGIN.left}
            y={12}
            className="fill-slate-600 text-[11px] font-semibold"
          >
            Cantidad
          </text>
          <text
            x={chartWidth - MARGIN.right}
            y={12}
            textAnchor="end"
            className="fill-emerald-700 text-[11px] font-semibold"
          >
            % acumulado
          </text>
        </svg>
      </div>
    </section>
  );
}
