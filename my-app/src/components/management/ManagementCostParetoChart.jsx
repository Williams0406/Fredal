"use client";

import { useMemo } from "react";
import { formatMoney } from "./buildItemHistorySummary";

const PERCENT_FORMATTER = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const AXIS_MONEY_FORMATTER = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const CHART_WIDTH = 960;
const CHART_HEIGHT = 380;
const MARGIN = {
  top: 20,
  right: 86,
  bottom: 120,
  left: 72,
};

function buildCostParetoData(rows = []) {
  const items = rows
    .filter((row) => Number(row.valorMonetario || 0) > 0)
    .sort((a, b) => Number(b.valorMonetario || 0) - Number(a.valorMonetario || 0));

  const totalValor = items.reduce(
    (acc, row) => acc + Number(row.valorMonetario || 0),
    0
  );
  let acumulado = 0;

  return {
    totalValor,
    items: items.map((row) => {
      const valorMonetario = Number(row.valorMonetario || 0);
      const porcentaje = totalValor > 0 ? (valorMonetario / totalValor) * 100 : 0;
      acumulado += porcentaje;

      return {
        itemId: row.itemId,
        itemCodigo: row.itemCodigo,
        itemNombre: row.itemNombre,
        valorMonetario,
        porcentaje,
        porcentajeAcumulado: Math.min(acumulado, 100),
      };
    }),
  };
}

export default function ManagementCostParetoChart({ rows = [] }) {
  const { items, totalValor } = useMemo(() => buildCostParetoData(rows), [rows]);

  const chartWidth = Math.max(CHART_WIDTH, items.length * 88);
  const plotWidth = chartWidth - MARGIN.left - MARGIN.right;
  const plotHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const maxValor = Math.max(...items.map((item) => item.valorMonetario), 1);
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
    const value = maxValor * (1 - ratio);
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
          <h2 className="text-lg font-semibold text-[#1e3a8a]">Pareto de costos</h2>
          <p className="mt-1 text-sm text-gray-600">
            Distribucion del valor monetario acumulado de los historiales visibles.
          </p>
        </div>

        <div className="py-10 text-center">
          <h3 className="text-base font-semibold text-gray-900">
            No hay items valorizados para graficar
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Ajusta los filtros actuales o espera historiales con valor monetario mayor a cero.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#1e3a8a]">Pareto de costos</h2>
          <p className="mt-1 text-sm text-gray-600">
            Las barras muestran el valor monetario por item y la linea el porcentaje acumulado.
          </p>
        </div>

        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">{items.length}</span> items valorizados
          {" · "}
          valor total{" "}
          <span className="font-medium text-gray-900">{formatMoney(totalValor)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <div className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-[#d97706]" />
          <span>Valor monetario</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="h-[2px] w-6 bg-[#1e3a8a]" />
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
          aria-label="Grafico pareto de items por valor monetario y porcentaje acumulado"
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
                {`S/ ${AXIS_MONEY_FORMATTER.format(tick.value)}`}
              </text>
            </g>
          ))}

          {rightAxisTicks.map((tick) => (
            <text
              key={`right-${tick.value}`}
              x={chartWidth - MARGIN.right + 10}
              y={tick.y + 4}
              textAnchor="start"
              className="fill-[#1e3a8a] text-[11px]"
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
            stroke="#bfdbfe"
          />

          {items.map((item, index) => {
            const x = MARGIN.left + index * slotWidth + (slotWidth - barWidth) / 2;
            const barHeight = (item.valorMonetario / maxValor) * plotHeight;
            const y = MARGIN.top + plotHeight - barHeight;
            const centerX = x + barWidth / 2;
            const lineY = MARGIN.top + plotHeight - (item.porcentajeAcumulado / 100) * plotHeight;

            return (
              <g key={item.itemId}>
                <title>
                  {`${item.itemCodigo} - ${item.itemNombre}: ${formatMoney(
                    item.valorMonetario
                  )} (${PERCENT_FORMATTER.format(item.porcentajeAcumulado)}% acumulado)`}
                </title>

                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, 2)}
                  rx="6"
                  fill="#d97706"
                  opacity="0.92"
                />

                <circle cx={centerX} cy={lineY} r="4" fill="#1e3a8a" />

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
            stroke="#1e3a8a"
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
            Valor monetario
          </text>
          <text
            x={chartWidth - MARGIN.right}
            y={12}
            textAnchor="end"
            className="fill-[#1e3a8a] text-[11px] font-semibold"
          >
            % acumulado
          </text>
        </svg>
      </div>
    </section>
  );
}
